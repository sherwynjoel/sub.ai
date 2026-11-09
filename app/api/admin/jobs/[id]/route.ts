import { recordDeleted } from "@/lib/styleUsage";
import { unlink } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { db, jobs, users } from "@/db";
import { json } from "@/lib/auth";
import { adminOrNull, logAdmin } from "@/lib/admin";
import { logUse } from "@/lib/credits";

/** Admin job actions: retry a failed job, or delete any job. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminOrNull();
  if (!me) return json({ error: "Admins only." }, 403);
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  const [j] = /^[0-9a-f-]{36}$/.test(id) ? await db.select().from(jobs).where(eq(jobs.id, id)) : [];
  if (!j) return json({ error: "Job not found." }, 404);
  const [owner] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, j.userId));

  if (action === "retry") {
    if (j.status !== "failed") return json({ error: "Only failed jobs can be retried." }, 409);
    if (!j.filePath) return json({ error: "The video was already deleted; ask the user to upload it again." }, 409);
    // The failure refunded these minutes; charge them again so a second failure doesn't refund twice.
    await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} + ${Math.ceil(j.durationSec)}` }).where(eq(users.id, j.userId));
    await db.update(jobs).set({ status: "queued", progress: 0, error: null, updatedAt: new Date() }).where(eq(jobs.id, j.id));
    await logUse(j.userId, Math.ceil(j.durationSec), { jobId: j.id, video: j.filename, kind: "upload", detail: "Tried again" });
    await logAdmin(me, "Retried a failed project", j.filename, owner);
    return json({ ok: true });
  }
  if (action === "delete") {
    if (j.status === "processing") return json({ error: "Wait until processing finishes." }, 409);
    // The upload and its styled MP4; a render still running notices the job is gone and removes its own file.
    for (const f of [j.filePath, j.previewPath, j.renderPath, j.overlayPath]) if (f) await unlink(f).catch(() => {});
    await recordDeleted(db, j);
    await db.delete(jobs).where(eq(jobs.id, j.id));
    await logAdmin(me, "Deleted a project", j.filename, owner);
    return json({ ok: true });
  }
  return json({ error: "Unknown action." }, 400);
}
