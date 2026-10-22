import { statfs } from "node:fs/promises";
import { and, gt, inArray, lt, sql } from "drizzle-orm";
import { db, jobs } from "@/db";
import { workerStatus } from "@/lib/admin";

export const dynamic = "force-dynamic";

const STUCK_MS = 15 * 60e3; // a job untouched this long while queued or running is stuck
const MIN_FREE_GB = 2;

/**
 * Uptime check (GitHub Actions calls it every 10 minutes, .github/workflows/uptime.yml): 200 when everything works,
 * 503 with the problems listed. Public, so it says only what is wrong, nothing about users or projects.
 */
export async function GET() {
  const problems: string[] = [];
  const hour = new Date(Date.now() - 3600e3);
  try {
    const [worker, [stuck], [recent], disk] = await Promise.all([
      workerStatus(),
      db.select({ n: sql<number>`count(*)::int` }).from(jobs).where(and(inArray(jobs.status, ["queued", "processing"]), lt(jobs.updatedAt, new Date(Date.now() - STUCK_MS)))),
      db.select({
        failed: sql<number>`(count(*) filter (where ${jobs.status} = 'failed'))::int`,
        done: sql<number>`(count(*) filter (where ${jobs.status} = 'done'))::int`,
      }).from(jobs).where(gt(jobs.updatedAt, hour)),
      statfs(process.env.STORAGE_DIR || "./storage").catch(() => null),
    ]);
    if (!worker.online) problems.push("worker not running");
    if (stuck.n) problems.push(`${stuck.n} job(s) stuck`);
    // Several failures and no success in the last hour: subtitling itself is broken (AI key, provider down).
    if (recent.failed >= 3 && !recent.done) problems.push(`${recent.failed} jobs failed in the last hour, none finished`);
    const freeGb = disk ? (disk.bavail * disk.bsize) / 1e9 : null;
    if (freeGb !== null && freeGb < MIN_FREE_GB) problems.push(`disk almost full (${freeGb.toFixed(1)} GB free)`);
  } catch {
    problems.push("database unreachable");
  }
  return Response.json({ ok: !problems.length, problems, at: new Date().toISOString() }, { status: problems.length ? 503 : 200, headers: { "cache-control": "no-store" } });
}
