import { stat } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { CAPTION_STYLES } from "@/lib/captionStyles";
import { ownJob } from "@/lib/jobs";
import { fileStream } from "@/lib/stream";

type Ctx = { params: Promise<{ id: string }> };

/** Queue a styled MP4: `{ style, lang: "ta" | "en" | "both" }`. The worker renders it. */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (!j.filePath) return json({ error: "The video was removed after 7 days, so it can't be rendered." }, 410);
  if (j.status !== "done" || !j.cues?.length) return json({ error: "Subtitles aren't ready yet." }, 409);
  if (j.renderStatus === "queued" || j.renderStatus === "rendering") return json({ error: "A render is already running." }, 409);
  const { style, lang } = await req.json().catch(() => ({}));
  if (!CAPTION_STYLES.some((s) => s.id === style)) return json({ error: "Unknown style." }, 400);
  if (!["ta", "en", "both"].includes(lang)) return json({ error: "Pick which subtitles to burn in." }, 400);
  await db.update(jobs).set({ captionStyle: style, renderLang: lang, renderStatus: "queued", renderProgress: 0, renderError: null }).where(eq(jobs.id, j.id));
  return json({ ok: true }, 202);
}

/** Download the finished styled MP4. */
export async function GET(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j?.renderPath || j.renderStatus !== "done") return json({ error: "No styled video yet." }, 404);
  const { size } = await stat(j.renderPath).catch(() => ({ size: -1 }));
  if (size < 0) return json({ error: "The styled video was removed. Render it again." }, 410);
  const base = j.filename.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "_") || "video";
  return new Response(fileStream(j.renderPath), {
    headers: { "content-type": "video/mp4", "content-length": String(size), "content-disposition": `attachment; filename="${base}.${j.captionStyle}.mp4"` },
  });
}
