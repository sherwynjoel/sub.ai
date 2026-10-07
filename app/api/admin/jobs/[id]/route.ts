import { unlink } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { db, jobs, users } from "@/db";
import { json } from "@/lib/auth";
import { adminOrNull } from "@/lib/admin";

/** Admin job actions: retry a failed job, or delete any job. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminOrNull())) return json({ error: "Admins only." }, 403);
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  const [j] = /^[0-9a-f-]{36}$/.test(id) ? await db.select().from(jobs).where(eq(jobs.id, id)) : [];
  if (!j) return json({ error: "Job not found." }, 404);

  if (action === "retry") {
    if (j.status !== "failed") return json({ error: "Only failed jobs can be retried." }, 409);
    if (!j.filePath) return json({ error: "The video was already deleted; ask the user to upload it again." }, 409);
    // The failure refunded these minutes; charge them again so a second failure doesn't refund twice.
    await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} + ${Math.ceil(j.durationSec)}` }).where(eq(users.id, j.userId));
    await db.update(jobs).set({ status: "queued", progress: 0, error: null, updatedAt: new Date() }).where(eq(jobs.id, j.id));
    return json({ ok: true });
  }
  if (action === "delete") {
    if (j.status === "processing") return json({ error: "Wait until processing finishes." }, 409);
    if (j.filePath) await unlink(j.filePath).catch(() => {});
    await db.delete(jobs).where(eq(jobs.id, j.id));
    return json({ ok: true });
  }
  return json({ error: "Unknown action." }, 400);
}
