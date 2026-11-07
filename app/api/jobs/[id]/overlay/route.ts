import { readdir } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { STYLE_CHOICES } from "@/lib/captionStyles";
import { ownJob } from "@/lib/jobs";
import { overlayKey } from "@/lib/overlay";
import { effectivePlan } from "@/lib/plans";
import { FONTS, logoFile } from "@/lib/render";
import { overlayPlan, readRate, readVideo } from "@/lib/renderPlan";
import { recordExport } from "@/lib/styleUsage";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The Adobe panel's styled captions, a transparent video for the timeline, are made on the user's computer
 * (plugin/device.js): `{ style, lang, probe }` (probe: what ffmpeg prints about the clip) returns the plan for them.
 * `key` names the look, so the panel can use a file it made before.
 */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (j.status !== "done" || !j.cues?.length) return json({ error: "Subtitles aren't ready yet." }, 409);
  const { style, lang, probe } = await req.json().catch(() => ({}));
  if (typeof probe !== "string" || probe.length > 50_000) return json({ error: "Update the Vasanamm panel: download the new version from the website's Plugin page." }, 426);
  if (!STYLE_CHOICES.some((s) => s.id === style)) return json({ error: "Unknown style." }, 400);
  if (!["ta", "en", "both"].includes(lang)) return json({ error: "Pick which subtitles to use." }, 400);
  const watermark = effectivePlan(u) === "free", logo = !!(await logoFile(j));
  await db.update(jobs).set({ captionStyle: style, updatedAt: new Date() }).where(eq(jobs.id, j.id));
  const plan = overlayPlan({ cues: j.cues, captionStyle: style, captionCustom: j.captionCustom, renderLang: lang, watermark }, { size: readVideo(probe).size, rate: readRate(probe), logo, seconds: j.durationSec });
  return json({ plan, logo, seconds: j.durationSec, key: overlayKey({ ...j, captionStyle: style }, lang, watermark), fonts: (await readdir(FONTS)).filter((f) => /\.(ttf|otf)$/i.test(f)) });
}

/** The panel has made a style: counted towards its use. */
export async function PUT(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  await recordExport(db, j);
  return json({ ok: true });
}
