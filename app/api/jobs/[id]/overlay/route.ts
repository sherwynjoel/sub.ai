import { stat } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { STYLE_CHOICES } from "@/lib/captionStyles";
import { ownJob } from "@/lib/jobs";
import { overlayKey } from "@/lib/overlay";
import { effectivePlan } from "@/lib/plans";
import { fileStream } from "@/lib/stream";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The Adobe panel's styled captions, a transparent video for the timeline: `{ style, lang }` asks for them (the worker
 * renders them with the MP4's code; the same look again is ready at once). GET says how it's going, and with `?file=1`
 * sends the file.
 */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (!j.filePath && j.videoTotal) return json({ error: "This project was made on the website, so its video is on that device. Generate this clip from the panel to use a style here." }, 409);
  if (!j.filePath) return json({ error: "The video was removed after 7 days, so this style can't be made. Generate the clip again." }, 410);
  if (j.status !== "done" || !j.cues?.length) return json({ error: "Subtitles aren't ready yet." }, 409);
  const { style, lang } = await req.json().catch(() => ({}));
  if (!STYLE_CHOICES.some((s) => s.id === style)) return json({ error: "Unknown style." }, 400);
  if (!["ta", "en", "both"].includes(lang)) return json({ error: "Pick which subtitles to use." }, 400);
  const key = overlayKey({ ...j, captionStyle: style }, lang, effectivePlan(u) === "free");
  if (j.overlayKey === key) {
    if (j.overlayStatus === "queued" || j.overlayStatus === "rendering") return json({ status: j.overlayStatus });
    if (j.overlayStatus === "done" && j.overlayPath && (await stat(j.overlayPath).catch(() => null))) return json({ status: "done" });
  }
  await db.update(jobs).set({ captionStyle: style, overlayLang: lang, overlayKey: key, overlayStatus: "queued", overlayProgress: 0, updatedAt: new Date() }).where(eq(jobs.id, j.id));
  return json({ status: "queued" }, 202);
}

export async function GET(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (!new URL(req.url).searchParams.has("file")) return json({ status: j.overlayStatus, progress: j.overlayProgress, key: j.overlayKey });
  const size = j.overlayPath && j.overlayStatus === "done" ? (await stat(j.overlayPath).catch(() => null))?.size : null;
  if (!j.overlayPath || size == null) return json({ error: "The styled captions aren't ready." }, 404);
  return new Response(fileStream(j.overlayPath), { headers: { "content-type": "video/quicktime", "content-length": String(size) } });
}
