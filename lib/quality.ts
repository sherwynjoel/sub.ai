import "server-only";
import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db, jobs } from "@/db";

/** A failure message without the parts that differ each time (ids, numbers, paths), so the same problem groups together. */
export function failureKind(error: string | null) {
  if (!error) return "No reason recorded";
  return error.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "…").replace(/\/[\w./-]+/g, "…").replace(/\d+(\.\d+)?/g, "N").replace(/\s+/g, " ").trim().slice(0, 140);
}

/** How well making subtitles is going: what fails most, how long it takes, and how long the queue is. */
export async function quality() {
  const week = new Date(Date.now() - 7 * 864e5), month = new Date(Date.now() - 30 * 864e5);
  const [failed, [counts], [speed], [queue], byProvider] = await Promise.all([
    db.select({ error: jobs.error, id: jobs.id, filename: jobs.filename, createdAt: jobs.createdAt }).from(jobs).where(and(eq(jobs.status, "failed"), gt(jobs.createdAt, month))),
    db.select({
      done: sql<number>`(count(*) filter (where ${jobs.status} = 'done'))::int`,
      failed: sql<number>`(count(*) filter (where ${jobs.status} = 'failed'))::int`,
    }).from(jobs).where(gt(jobs.createdAt, month)),
    // Seconds of work per minute of video, for runs that finished in the last 7 days.
    db.select({
      n: sql<number>`count(*)::int`,
      median: sql<number>`percentile_cont(0.5) within group (order by extract(epoch from ${jobs.finishedAt} - ${jobs.startedAt}))::float`,
      slowest: sql<number>`max(extract(epoch from ${jobs.finishedAt} - ${jobs.startedAt}))::float`,
      perMin: sql<number>`(sum(extract(epoch from ${jobs.finishedAt} - ${jobs.startedAt})) / nullif(sum(${jobs.durationSec}) / 60, 0))::float`,
    }).from(jobs).where(and(eq(jobs.status, "done"), isNotNull(jobs.startedAt), isNotNull(jobs.finishedAt), gt(jobs.finishedAt, week))),
    db.select({
      waiting: sql<number>`(count(*) filter (where ${jobs.status} = 'queued'))::int`,
      processing: sql<number>`(count(*) filter (where ${jobs.status} = 'processing'))::int`,
      oldest: sql<Date | null>`min(${jobs.updatedAt}) filter (where ${jobs.status} = 'queued')`,
    }).from(jobs),
    db.select({ provider: jobs.provider, done: sql<number>`(count(*) filter (where ${jobs.status} = 'done'))::int`, failed: sql<number>`(count(*) filter (where ${jobs.status} = 'failed'))::int` })
      .from(jobs).where(and(gt(jobs.createdAt, month), isNotNull(jobs.provider))).groupBy(jobs.provider),
  ]);
  const groups = new Map<string, { kind: string; n: number; last: Date; example: { id: string; filename: string } }>();
  for (const f of failed) {
    const k = failureKind(f.error), g = groups.get(k);
    if (g) { g.n++; if (f.createdAt > g.last) { g.last = f.createdAt; g.example = f; } }
    else groups.set(k, { kind: k, n: 1, last: f.createdAt, example: f });
  }
  const oldest = queue.oldest ? new Date(queue.oldest) : null;
  const waitMin = oldest ? (Date.now() - oldest.getTime()) / 60e3 : 0;
  return {
    reasons: [...groups.values()].sort((a, b) => b.n - a.n),
    done: counts.done, failed: counts.failed, failRate: counts.done + counts.failed ? counts.failed / (counts.done + counts.failed) : 0,
    speed, queue: { ...queue, oldest, waitMin, slow: queue.waiting >= 5 || waitMin > 10 },
    byProvider,
  };
}
