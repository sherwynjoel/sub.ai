import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { toSrt, toTxt, toVtt, type Lang } from "@/lib/subtitles";

const FORMATS = { srt: [toSrt, "application/x-subrip"], vtt: [toVtt, "text/vtt"], txt: [toTxt, "text/plain"] } as const;

/** GET /api/jobs/:id/export?lang=ta|en|both&fmt=srt|vtt|txt */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j?.cues) return json({ error: "Not ready" }, 404);
  const q = new URL(req.url).searchParams;
  const lang = (["ta", "en", "both"].includes(q.get("lang")!) ? q.get("lang") : "en") as Lang;
  const fmt = (q.get("fmt") ?? "srt") as keyof typeof FORMATS;
  if (!FORMATS[fmt]) return json({ error: "Unknown format" }, 400);
  const [fn, type] = FORMATS[fmt];
  const base = j.filename.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "_") || "subtitles";
  return new Response("\uFEFF" + fn(j.cues, lang), {
    headers: {
      "content-type": `${type}; charset=utf-8`,
      "content-disposition": `attachment; filename="${base}.${lang}.${fmt}"`,
    },
  });
}
