import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, jobs, type Cue } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob, publicJob } from "@/lib/jobs";
import { CAPTION_STYLES, sanitizeCustom } from "@/lib/captionStyles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  return j ? json(publicJob(j, true)) : json({ error: "Not found" }, 404);
}

/** Save edited cues. */
export async function PATCH(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  const { cues, captionStyle, captionCustom } = await req.json().catch(() => ({}));
  if (cues === undefined && (captionStyle !== undefined || captionCustom !== undefined)) {
    if (captionStyle !== undefined && !CAPTION_STYLES.some((s) => s.id === captionStyle)) return json({ error: "Unknown style." }, 400);
    await db.update(jobs).set({
      ...(captionStyle !== undefined ? { captionStyle } : {}),
      ...(captionCustom !== undefined ? { captionCustom: sanitizeCustom(captionCustom) } : {}),
    }).where(eq(jobs.id, j.id));
    return json({ ok: true });
  }
  const valid =
    Array.isArray(cues) && cues.length <= 20000 &&
    cues.every((c: Cue) => Number.isFinite(c.start) && Number.isFinite(c.end) && c.end >= c.start && typeof c.ta === "string" && typeof c.en === "string");
  if (!valid) return json({ error: "Invalid subtitles." }, 400);
  const clean = (cues as Cue[]).map(({ start, end, ta, en }) => ({ start, end, ta: ta.slice(0, 500), en: en.slice(0, 500) })).sort((a, b) => a.start - b.start);
  await db.update(jobs).set({ cues: clean, updatedAt: new Date() }).where(eq(jobs.id, j.id));
  return json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (j.status === "processing") return json({ error: "Wait until processing finishes." }, 409);
  if (j.filePath) await unlink(j.filePath).catch(() => {});
  await db.delete(jobs).where(eq(jobs.id, j.id));
  return json({ ok: true });
}
