import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { shortCode } from "@/lib/languages";
import { shiftCues, toSrt, toTxt, toVtt, type Lang, englishCues } from "@/lib/subtitles";

const FORMATS = { srt: [toSrt, "application/x-subrip"], vtt: [toVtt, "text/vtt"], txt: [toTxt, "text/plain"] } as const;

/** GET /api/jobs/:id/export?lang=ta|en|both&fmt=srt|vtt|txt[&shift=seconds] (shift lines up a clip placed later on an NLE timeline) */
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
  const shift = Number(q.get("shift") ?? 0);
  if (!Number.isFinite(shift) || Math.abs(shift) > 86400) return json({ error: "Bad shift" }, 400);
  const own = lang === "en" ? englishCues(j.cues) : j.cues; // English alone reads in whole sentences
  const cues = shift ? shiftCues(own, shift) : own;
  const base = j.filename.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "_") || "subtitles";
  return new Response("\uFEFF" + fn(cues, lang, j.captionCustom?.lines), {
    headers: {
      "content-type": `${type}; charset=utf-8`,
      "content-disposition": `attachment; filename="${base}.${lang === "ta" ? shortCode(j.language) : lang}.${fmt}"`,
    },
  });
}
