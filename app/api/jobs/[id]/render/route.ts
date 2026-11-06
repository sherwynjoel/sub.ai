import { attachment, stem } from "@/lib/projectName";
import { readdir, stat } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { CAPTION_STYLES } from "@/lib/captionStyles";
import { ownJob } from "@/lib/jobs";
import { effectivePlan } from "@/lib/plans";
import { FONTS, logoFile } from "@/lib/render";
import { exportPlan, type VideoInfo } from "@/lib/renderPlan";
import { fileStream } from "@/lib/stream";
import { recordExport } from "@/lib/styleUsage";

type Ctx = { params: Promise<{ id: string }> };

/** What the device says about the video, kept to what can only be that: it goes into ffmpeg's instructions. */
function videoInfo(v: Partial<VideoInfo> | undefined): VideoInfo | null {
  const side = (n: unknown) => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 16384;
  const word = (w: unknown) => typeof w === "string" && /^[a-z0-9-]{2,24}$/.test(w);
  if (!v || (v.size && !(side(v.size.width) && side(v.size.height)))) return null;
  if (v.colour && !(word(v.colour.space) && word(v.colour.primaries) && word(v.colour.trc))) return null;
  return { size: v.size ?? null, aac: !!v.aac, deep: !!v.deep, colour: v.colour ?? null };
}

/**
 * What a styled MP4 needs, for the user's device to make it (lib/deviceExport.ts): `{ style, lang: "ta" | "en" | "both" }`.
 * The plan is written here so the free plan's mark comes with it.
 */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (!j.filePath && !j.videoTotal) return json({ error: "The video was removed after 7 days, so it can't be rendered." }, 410);
  if (j.status !== "done" || !j.cues?.length) return json({ error: "Subtitles aren't ready yet." }, 409);
  const { style, lang, video } = await req.json().catch(() => ({}));
  if (!CAPTION_STYLES.some((s) => s.id === style)) return json({ error: "Unknown style." }, 400);
  if (!["ta", "en", "both"].includes(lang)) return json({ error: "Pick which subtitles to burn in." }, 400);
  const info = videoInfo(video);
  if (!info) return json({ error: "Couldn't read the video." }, 400);
  await db.update(jobs).set({ captionStyle: style, renderLang: lang }).where(eq(jobs.id, j.id));
  const plan = exportPlan({ cues: j.cues, captionStyle: style, captionCustom: j.captionCustom, renderLang: lang, watermark: effectivePlan(u) === "free" }, { ...info, logo: !!(await logoFile(j)) });
  return json({ plan, seconds: j.durationSec, fonts: (await readdir(FONTS)).filter((f) => /\.(ttf|otf)$/i.test(f)) });
}

/** The device has finished an export: counted towards the style's use. */
export async function PUT(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  await recordExport(db, j);
  return json({ ok: true });
}

/** Download the finished styled MP4. */
export async function GET(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j?.renderPath || (j.renderStatus !== "done" && j.renderStatus !== "stale")) return json({ error: "No styled video yet." }, 404);
  const { size } = await stat(j.renderPath).catch(() => ({ size: -1 }));
  if (size < 0) return json({ error: "The styled video was removed. Render it again." }, 410);
  const base = j.filename.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "_") || "video";
  return new Response(fileStream(j.renderPath), {
    headers: { "content-type": "video/mp4", "content-length": String(size), "content-disposition": attachment(`${stem(j.filename)}.${j.captionStyle}.mp4`, `${base}.${j.captionStyle}.mp4`) },
  });
}
