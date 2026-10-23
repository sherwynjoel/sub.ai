/**
 * Background worker: picks queued jobs, extracts audio, sends chunks to the configured AI, stores cues.
 * Run alongside the web app:  npm run worker
 */
import { mkdtemp, readdir, readFile, rm, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { and, eq, lt, isNotNull, sql } from "drizzle-orm";
import { db, jobs, settings, users, type Cue } from "./db";
import { getAiConfig, transcribe, type Script } from "./lib/ai";
import { extractChunks, LEVEL_FRAME, loudness, probe, STORAGE } from "./lib/media";
import { speechRegions } from "./lib/timing";
import { ALIGN_LANGS, alignCues } from "./lib/align";
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
    const files = await extractChunks(job.filePath!, dir);
    let done = 0, offset = 0;
    const plan = [];
    for (const f of files) {
      const duration = (await probe(f)) ?? 0;
      plan.push({ f, offset, duration });
      offset += duration;
    }
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
    const level = await loudness(job.filePath!), merged = mergeChunks(results);
    const timed = ALIGN_LANGS.includes(job.language) && !translated ? await alignCues(job.filePath!, merged) : merged;
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

async function fail(job: typeof jobs.$inferSelect, err: unknown) {
  console.error(`job ${job.id} failed`, err);
  await db.update(jobs).set({ status: "failed", error: String((err as Error)?.message ?? err).slice(0, 500), updatedAt: new Date() }).where(eq(jobs.id, job.id));
  // Give the minutes back — the user got nothing for them. (A redo with another caption type cost nothing.)
  if (!job.redos) await db.update(users).set({ secondsUsed: sql`greatest(0, ${users.secondsUsed} - ${Math.ceil(job.durationSec)})` }).where(eq(users.id, job.userId));
}

async function purgeOld() {
  const old = await db.select().from(jobs).where(and(isNotNull(jobs.filePath), lt(jobs.createdAt, new Date(Date.now() - KEEP_DAYS * 864e5))));
  for (const j of old) {
    await unlink(j.filePath!).catch(() => {});
    if (j.renderPath) await unlink(j.renderPath).catch(() => {});
    await db.update(jobs).set({ filePath: null, renderPath: null, renderStatus: null }).where(eq(jobs.id, j.id));
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
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main();
