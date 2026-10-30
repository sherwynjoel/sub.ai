/**
 * Background worker: picks queued jobs, extracts audio, sends chunks to the configured AI, stores cues.
 * Run alongside the web app:  npm run worker
 */
import { mkdtemp, readdir, readFile, rm, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { and, desc, eq, isNotNull, isNull, lt, ne, notLike, or, sql } from "drizzle-orm";
import { db, jobs, settings, users, type Cue } from "./db";
import { getAiConfig, transcribe, type Script } from "./lib/ai";
import { effectivePlan, PLANS } from "./lib/plans";
import { extractChunks, LEVEL_FRAME, loudness, makePreview, probe, removeUploads, STORAGE } from "./lib/media";
import { speechRegions } from "./lib/timing";
import { alignCues } from "./lib/align";
import { translateLines } from "./lib/ai/translate";
import { renderStyled } from "./lib/render";
import { dropAnchor, englishCues, mergeChunks, mergeShort, retimeWindows, snapToPauses, withWordTimes } from "./lib/subtitles";

const PARALLEL_CHUNKS = 3;
const KEEP_DAYS = 7;

async function claim() {
  const rows = await db.execute(sql`
    UPDATE jobs SET status = 'processing', progress = 1, updated_at = now()
    WHERE id = (SELECT id FROM jobs WHERE status = 'queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id`);
  const id = (rows as unknown as { id: string }[])[0]?.id;
  return id ? (await db.select().from(jobs).where(eq(jobs.id, id)))[0] : null;
}

async function processJob(job: typeof jobs.$inferSelect) {
  const cfg = await getAiConfig();
  await db.update(jobs).set({ provider: cfg.provider, model: cfg.model }).where(eq(jobs.id, job.id));
  const dir = await mkdtemp(join(tmpdir(), "vasanam-"));
  try {
    const source = job.audioPath ?? job.filePath!; // phones send the sound first; the video may still be arriving
    const files = await extractChunks(source, dir, Math.ceil(job.durationSec) + 1); // only what was charged
    let done = 0, offset = 0;
    const plan = [];
    for (const f of files) {
      const duration = (await probe(f)) ?? 0;
      plan.push({ f, offset, duration });
      offset += duration;
    }
    await chargeExtra(job, offset);
    const results: { offset: number; duration: number; cues: Cue[] }[] = [];
    // "Translate to <language>" (English speech): Sarvam writes down the English, which is translated below; the
    // LLM providers translate as they listen (English speech becomes <language> in their main line).
    const translated = job.script === "translated", bySarvam = translated && cfg.provider === "sarvam";
    const ask = bySarvam ? { lang: "en-IN", want: { script: "mixed" as Script, english: false } }
      : { lang: job.language, want: { script: (translated ? "mixed" : job.script) as Script, english: translated || job.withEnglish } };
    // Simple pool: PARALLEL_CHUNKS requests in flight.
    const queue = [...plan];
    await Promise.all(Array.from({ length: PARALLEL_CHUNKS }, async () => {
      for (let c; (c = queue.shift()); ) {
        const cues = await transcribe(await readFile(c.f), c.duration, cfg, ask.lang, ask.want).catch((e) => {
          queue.length = 0; // stop the other lanes too
          throw e;
        });
        results.push({ offset: c.offset, duration: c.duration, cues });
        done++;
        await db.update(jobs).set({ progress: Math.round(5 + (90 * done) / plan.length), updatedAt: new Date() }).where(eq(jobs.id, job.id));
      }
    }));
    // Cuts inside a model's window are estimates: time them from where the speech is, then settle each on the
    // nearby pause, and record when every word starts. Without readable audio the estimates stay.
    // Where the word-timing model knows the language, every word is placed in the audio first (lib/align.ts);
    // windows it can't place keep the loudness estimates.
    const level = await loudness(source), merged = mergeChunks(results);
    // Words placed in the audio (lib/align.ts): what was said is the main line, or the English for "Translate to …".
    const timed = await alignCues(source, merged, job.language, translated ? "en" : "ta");
    const cues = level
      ? withWordTimes(mergeShort(snapToPauses(retimeWindows(timed, level, LEVEL_FRAME), level, LEVEL_FRAME)), level, LEVEL_FRAME)
      : mergeShort(timed).map(dropAnchor);
    // English only: the captions are the translation in whole sentences (not cut where the Tamil was).
    let stored = job.captionCustom?.show === "en" ? englishCues(cues) : cues;
    if (bySarvam) { // the English, cut into whole sentences, each translated
      const sentences = englishCues(cues.map((c) => ({ ...c, en: c.ta, we: c.w, ta: "", w: undefined })));
      const lines = await translateLines(sentences.map((c) => c.en), job.language);
      stored = sentences.map((c, i) => ({ ...c, ta: lines[i] }));
      await db.update(jobs).set({ progress: 98 }).where(eq(jobs.id, job.id));
    }
    const speech = level ? speechRegions(level, LEVEL_FRAME) : null; // for the editor's timing check
    await db.update(jobs).set({ status: "done", progress: 100, error: null, cues: stored, speech, updatedAt: new Date() }).where(eq(jobs.id, job.id));
    console.log(`job ${job.id} done (${plan.length} chunks, ${cfg.provider}/${cfg.model})`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Styled-MP4 renders are queued from the editor and run here, after any waiting transcriptions. */
async function claimRender() {
  const rows = await db.execute(sql`
    UPDATE jobs SET render_status = 'rendering', render_progress = 0, render_error = null
    WHERE id = (SELECT id FROM jobs WHERE render_status = 'queued' ORDER BY updated_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id`);
  const id = (rows as unknown as { id: string }[])[0]?.id;
  return id ? (await db.select().from(jobs).where(eq(jobs.id, id)))[0] : null;
}

async function processRender(job: typeof jobs.$inferSelect) {
  try {
    if (!job.filePath || !job.cues?.length) throw new Error("The video or its subtitles are no longer available.");
    let last = 0;
    const out = await renderStyled({ ...job, filePath: job.filePath, cues: job.cues }, (pct) => {
      if (pct < last + 5) return;
      last = pct;
      db.update(jobs).set({ renderProgress: pct }).where(eq(jobs.id, job.id)).catch(console.error);
    });
    const kept = await db.update(jobs).set({ renderStatus: "done", renderProgress: 100, renderPath: out }).where(eq(jobs.id, job.id)).returning({ id: jobs.id });
    if (!kept.length) { await unlink(out).catch(() => {}); return; } // the project was deleted while it rendered
    console.log(`render ${job.id} done (${job.captionStyle})`);
  } catch (e) {
    console.error(`render ${job.id} failed`, e);
    await db.update(jobs).set({ renderStatus: "failed", renderError: "Couldn't render the styled video. Try again, or pick another style." }).where(eq(jobs.id, job.id));
  }
}

/**
 * The sound as prepared for the AI is the true length (a file can state less, and timestamps can be wrong when its
 * sample rate changes midway). More than was charged at upload: charge the rest now, or stop before the AI hears it
 * (fail() then gives back what was charged).
 */
async function chargeExtra(job: typeof jobs.$inferSelect, heard: number) {
  const extra = Math.ceil(heard) - Math.ceil(job.durationSec);
  if (extra <= 2) return; // rounding between formats
  const [u] = await db.select().from(users).where(eq(users.id, job.userId));
  const quota = u ? PLANS[effectivePlan(u)].minutes * 60 : 0;
  const ok = await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} + ${extra}` })
    .where(and(eq(users.id, job.userId), sql`${users.secondsUsed} + ${extra} <= ${quota}`)).returning({ id: users.id });
  if (!ok.length) throw new Error(`This file has ${Math.ceil(heard / 60)} min of sound, more than its stated length, and there aren't enough minutes left for all of it. Your minutes for it were given back.`);
  job.durationSec = heard; // so a later failure gives back everything charged
  await db.update(jobs).set({ durationSec: heard }).where(eq(jobs.id, job.id));
  console.log(`job ${job.id}: ${extra}s more sound than stated, charged`);
}

/** The current playback copy's name ending: a copy made before (heavier, 720p) is made again. */
const PREVIEW = ".preview540.mp4";

/** The next video without a current playback copy (new uploads, and older projects too), after transcriptions and renders. */
async function claimPreview() {
  const [j] = await db.select().from(jobs).where(and(isNotNull(jobs.filePath), or(isNull(jobs.previewPath), and(ne(jobs.previewPath, ""), notLike(jobs.previewPath, `%${PREVIEW}`))),
    ne(jobs.status, "queued"), ne(jobs.status, "processing"))).orderBy(desc(jobs.createdAt)).limit(1);
  return j ?? null;
}

async function processPreview(job: typeof jobs.$inferSelect) {
  const out = join(dirname(job.filePath!), `${job.id}${PREVIEW}`), old = job.previewPath;
  const made = await makePreview(job.filePath!, out).catch((e) => { console.error(`preview ${job.id} failed`, e); return false; });
  // "" = plays the original (light already, or the copy failed): not tried again
  const kept = await db.update(jobs).set({ previewPath: made ? out : "" }).where(and(eq(jobs.id, job.id), isNotNull(jobs.filePath))).returning({ id: jobs.id });
  if (made && !kept.length) await unlink(out).catch(() => {}); // the project was deleted meanwhile
  if (old && old !== out) await unlink(old).catch(() => {}); // the earlier, heavier copy
  if (made) console.log(`preview ${job.id} made`);
}

async function fail(job: typeof jobs.$inferSelect, err: unknown) {
  console.error(`job ${job.id} failed`, err);
  await db.update(jobs).set({ status: "failed", error: String((err as Error)?.message ?? err).slice(0, 500), updatedAt: new Date() }).where(eq(jobs.id, job.id));
  // Give the minutes back — the user got nothing for them. (A redo with another caption type cost nothing.)
  if (!job.redos) await db.update(users).set({ secondsUsed: sql`greatest(0, ${users.secondsUsed} - ${Math.ceil(job.durationSec)})` }).where(eq(users.id, job.userId));
}

async function purgeOld() {
  const old = await db.select().from(jobs).where(and(or(isNotNull(jobs.filePath), isNotNull(jobs.audioPath), isNotNull(jobs.videoTotal)), lt(jobs.createdAt, new Date(Date.now() - KEEP_DAYS * 864e5))));
  for (const j of old) {
    await removeUploads(j);
    if (j.renderPath) await unlink(j.renderPath).catch(() => {});
    await db.update(jobs).set({ filePath: null, audioPath: null, videoTotal: null, previewPath: null, renderPath: null, renderStatus: null }).where(eq(jobs.id, j.id));
  }
  // Styled MP4s whose project no longer exists (deleted before deletes removed them too). Safe only because
  // this runs between renders in the same loop: a render in progress has no renderPath yet.
  const dir = join(STORAGE, "renders"), live = new Set((await db.select({ p: jobs.renderPath }).from(jobs).where(isNotNull(jobs.renderPath))).map((r) => r.p));
  for (const f of await readdir(dir).catch(() => [] as string[])) if (!live.has(join(dir, f))) await unlink(join(dir, f)).catch(() => {});
}

/** Lets /admin show whether the worker is alive. */
async function heartbeat() {
  const value = new Date().toISOString();
  await db.insert(settings).values({ key: "worker_heartbeat", value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

async function main() {
  heartbeat().catch(console.error);
  setInterval(() => heartbeat().catch(console.error), 20e3);
  // ponytail: assumes a single worker process; with several, only requeue jobs whose updated_at is stale.
  await db.update(jobs).set({ status: "queued", progress: 0 }).where(eq(jobs.status, "processing"));
  await db.update(jobs).set({ renderStatus: "queued", renderProgress: 0 }).where(eq(jobs.renderStatus, "rendering"));
  console.log("worker ready");
  let lastPurge = 0;
  for (;;) {
    if (Date.now() - lastPurge > 3600e3) {
      lastPurge = Date.now();
      await purgeOld().catch(console.error);
    }
    const job = await claim().catch((e) => (console.error(e), null));
    if (job) { await processJob(job).catch((e) => fail(job, e)); continue; }
    const render = await claimRender().catch((e) => (console.error(e), null));
    if (render) { await processRender(render); continue; }
    const preview = await claimPreview().catch((e) => (console.error(e), null));
    if (preview) { await processPreview(preview); continue; }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main();
