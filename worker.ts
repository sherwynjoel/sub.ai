/**
 * Background worker: picks queued jobs, extracts audio, sends chunks to the configured AI, stores cues.
 * Run alongside the web app:  npm run worker
 */
import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { and, eq, lt, isNotNull, sql } from "drizzle-orm";
import { db, jobs, users, type Cue } from "./db";
import { getAiConfig, transcribe } from "./lib/ai";
import { extractChunks, probe } from "./lib/media";
import { mergeChunks } from "./lib/subtitles";

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
    // Simple pool: PARALLEL_CHUNKS requests in flight.
    const queue = [...plan];
    await Promise.all(Array.from({ length: PARALLEL_CHUNKS }, async () => {
      for (let c; (c = queue.shift()); ) {
        const cues = await transcribe(await readFile(c.f), c.duration, cfg).catch((e) => {
          queue.length = 0; // stop the other lanes too
          throw e;
        });
        results.push({ offset: c.offset, duration: c.duration, cues });
        done++;
        await db.update(jobs).set({ progress: Math.round(5 + (90 * done) / plan.length), updatedAt: new Date() }).where(eq(jobs.id, job.id));
      }
    }));
    await db.update(jobs).set({ status: "done", progress: 100, cues: mergeChunks(results), updatedAt: new Date() }).where(eq(jobs.id, job.id));
    console.log(`job ${job.id} done (${plan.length} chunks, ${cfg.provider}/${cfg.model})`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function fail(job: typeof jobs.$inferSelect, err: unknown) {
  console.error(`job ${job.id} failed`, err);
  await db.update(jobs).set({ status: "failed", error: String((err as Error)?.message ?? err).slice(0, 500), updatedAt: new Date() }).where(eq(jobs.id, job.id));
  // Give the minutes back — the user got nothing for them.
  await db.update(users).set({ secondsUsed: sql`greatest(0, ${users.secondsUsed} - ${Math.ceil(job.durationSec)})` }).where(eq(users.id, job.userId));
}

async function purgeOld() {
  const old = await db.select().from(jobs).where(and(isNotNull(jobs.filePath), lt(jobs.createdAt, new Date(Date.now() - KEEP_DAYS * 864e5))));
  for (const j of old) {
    await unlink(j.filePath!).catch(() => {});
    await db.update(jobs).set({ filePath: null }).where(eq(jobs.id, j.id));
  }
}

async function main() {
  // ponytail: assumes a single worker process; with several, only requeue jobs whose updated_at is stale.
  await db.update(jobs).set({ status: "queued", progress: 0 }).where(eq(jobs.status, "processing"));
  console.log("worker ready");
  let lastPurge = 0;
  for (;;) {
    if (Date.now() - lastPurge > 3600e3) await purgeOld().catch(console.error), (lastPurge = Date.now());
    const job = await claim().catch((e) => (console.error(e), null));
    if (!job) { await new Promise((r) => setTimeout(r, 2000)); continue; }
    await processJob(job).catch((e) => fail(job, e));
  }
}

main();
