import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { englishCues } from "@/lib/subtitles";
import { CAPTION_TYPES, MAX_REDOS, typeSettings, type CaptionType } from "@/lib/captionTypes";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Change a project's caption type: POST {type, withEnglish}. When the lines needed are already there (hiding the
 * English line, or English only from captions that have it) it's instant; otherwise the captions are made again
 * from the video, without using minutes, up to MAX_REDOS times. Edits to the text are replaced; the look stays.
 */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  const body = await req.json().catch(() => ({}));
  if (!CAPTION_TYPES.some((t) => t.id === body.type)) return json({ error: "Unknown caption type." }, 400);
  const want = typeSettings(body.type as CaptionType, !!body.withEnglish);
  // A redo that failed can be tried again (it cost no minutes; a failed upload's minutes were given back).
  if (j.status !== "done" && !(j.status === "failed" && j.redos > 0)) return json({ error: "Wait until the captions are ready." }, 409);

  const cues = j.cues ?? [], hasTa = cues.some((c) => c.ta.trim()), hasEn = cues.some((c) => c.en.trim());
  const show = j.captionCustom?.show ?? "both";
  // Same words, shown differently: no need to listen again.
  if (want.script === j.script && hasTa && (want.show === "ta" || (want.show === "both" && hasEn))) {
    await db.update(jobs).set({ withEnglish: want.english, captionCustom: { ...j.captionCustom, show: want.show } }).where(eq(jobs.id, j.id));
    return json({ ok: true, redone: false });
  }
  if (want.show === "en" && hasEn && show !== "en") {
    await db.update(jobs).set({ cues: englishCues(cues), captionCustom: { ...j.captionCustom, show: "en" } }).where(eq(jobs.id, j.id));
    return json({ ok: true, redone: false });
  }
  if (!j.filePath && !j.audioPath) return json({ error: "The video was removed after 7 days, so the captions can't be made again. Upload it again to change the caption type." }, 409);
  if (j.redos >= MAX_REDOS) return json({ error: `You've changed this project's caption type ${MAX_REDOS} times. Upload the video again for another type.` }, 429);
  if (j.renderPath) await unlink(j.renderPath).catch(() => {});
  await db.update(jobs).set({
    script: want.script, withEnglish: want.english, captionCustom: { ...j.captionCustom, show: want.show },
    status: "queued", progress: 0, error: null, cues: null, speech: null,
    renderStatus: null, renderPath: null, renderError: null, redos: j.redos + 1, updatedAt: new Date(),
  }).where(eq(jobs.id, j.id));
  return json({ ok: true, redone: true });
}
