import { and, eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import type { User } from "@/lib/auth";

export async function ownJob(id: string, u: User) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [j] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, u.id)));
  return j ?? null;
}

/** What the client may see (no server paths). */
export function publicJob(j: typeof jobs.$inferSelect, withCues = false) {
  return {
    id: j.id, filename: j.filename, language: j.language, durationSec: j.durationSec, status: j.status, progress: j.progress,
    provider: j.provider, model: j.model, error: j.error, createdAt: j.createdAt, hasMedia: !!j.filePath,
    cueCount: j.cues?.length ?? 0, ...(withCues ? { cues: j.cues ?? [] } : {}),
  };
}
