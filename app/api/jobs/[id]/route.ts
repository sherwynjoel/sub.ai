import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, jobs, type Cue } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob, publicJob } from "@/lib/jobs";
import { CAPTION_STYLES, sanitizeCustom } from "@/lib/captionStyles";
import { LEVEL_FRAME, loudness } from "@/lib/media";
import { withWordTimes } from "@/lib/subtitles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  // Jobs from before word timing (or edited since): time the words from the audio once, while the upload is kept.
  if (j.status === "done" && j.filePath && j.cues?.length && !j.cues.some((c) => c.w || c.we)) {
    const level = await loudness(j.filePath);
    if (level) {
      j.cues = withWordTimes(j.cues, level, LEVEL_FRAME);
      await db.update(jobs).set({ cues: j.cues }).where(eq(jobs.id, j.id));
    }
  }
  return json(publicJob(j, true));
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
  // Word times stay while their line still has that many words and they sit inside the cue (an edit drops them).
  const times = (t: unknown, line: string, start: number, end: number) =>
    Array.isArray(t) && t.length === line.split(/\s+/).filter(Boolean).length && t.every((x) => Number.isFinite(x) && x >= start - 0.01 && x <= end + 0.01) ? (t as number[]) : undefined;
  // A colour per word, while the line still has that many words.
  const colors = (v: unknown, line: string) =>
    Array.isArray(v) && v.length === line.split(/\s+/).filter(Boolean).length && v.every((x) => x === null || (typeof x === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(x))) && v.some(Boolean) ? (v as (string | null)[]) : undefined;
  const clean = (cues as Cue[]).map(({ start, end, ta, en, w, we, style, wc, wce }) => {
    const c: Cue = { start, end, ta: ta.slice(0, 500), en: en.slice(0, 500) };
    const wt = times(w, c.ta, start, end), et = times(we, c.en, start, end);
    if (wt) c.w = wt;
    if (et) c.we = et;
    const own = sanitizeCustom(style); // this caption's own look; safe zones stay project-wide
    delete own.safe; delete own.safeCustom;
    if (Object.keys(own).length) c.style = own;
    const tc = colors(wc, c.ta), ec = colors(wce, c.en);
    if (tc) c.wc = tc;
    if (ec) c.wce = ec;
    return c;
  }).sort((a, b) => a.start - b.start);
  await db.update(jobs).set({ cues: clean, updatedAt: new Date() }).where(eq(jobs.id, j.id));
  return json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (j.status === "processing") return json({ error: "Wait until processing finishes." }, 409);
  // The upload and its styled MP4; a render still running notices the job is gone and removes its own file.
  for (const f of [j.filePath, j.renderPath]) if (f) await unlink(f).catch(() => {});
  await db.delete(jobs).where(eq(jobs.id, j.id));
  return json({ ok: true });
}
