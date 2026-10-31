import { eq } from "drizzle-orm";
import { db, jobs, type Cue } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { isLanguage, languageOf } from "@/lib/languages";
import { translateLines } from "@/lib/ai/translate";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Translate the captions: `{ lang }`, an Indian language code or "en-IN".
 * Into English: the main line translated into the English line (added if the project had none).
 * Into another language: the main line becomes that language, translated from the English line when there is one
 * (the better source), else from the main line; the project's language becomes it. Times stay; a translated line's
 * word times, colours and looks go (its words are new).
 */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (j.status !== "done" || !j.cues?.length) return json({ error: "Subtitles aren't ready yet." }, 409);
  const { lang } = await req.json().catch(() => ({}));
  if (lang !== "en-IN" && !isLanguage(lang)) return json({ error: "Pick a language." }, 400);
  const cues = j.cues as Cue[];
  const hasEn = cues.some((c) => c.en.trim()), hasMain = cues.some((c) => c.ta.trim());
  try {
    if (lang === "en-IN") {
      if (!hasMain) return json({ error: "There's no caption line to translate." }, 409);
      const out = await translateLines(cues.map((c) => c.ta), "en-IN", j.language);
      const next = cues.map((c, i) => { const n: Cue = { ...c, en: out[i] }; delete n.we; delete n.wce; delete n.wfe; return n; });
      const show = j.captionCustom?.show === "ta" ? { ...j.captionCustom, show: "both" as const } : j.captionCustom;
      await db.update(jobs).set({ cues: next, withEnglish: true, captionCustom: show, updatedAt: new Date() }).where(eq(jobs.id, j.id));
      return json({ ok: true, language: "English" });
    }
    const from = hasEn ? "en-IN" : j.language;
    if (!hasEn && !hasMain) return json({ error: "There's no caption line to translate." }, 409);
    if (from === lang) return json({ error: `The captions are in ${languageOf(lang).name} already.` }, 409);
    const out = await translateLines(cues.map((c) => (hasEn ? c.en : c.ta)), lang, from);
    const next = cues.map((c, i) => { const n: Cue = { ...c, ta: out[i] }; delete n.w; delete n.wc; delete n.wf; return n; });
    await db.update(jobs).set({ cues: next, language: lang, script: "translated", updatedAt: new Date() }).where(eq(jobs.id, j.id));
    return json({ ok: true, language: languageOf(lang).name });
  } catch (e) {
    console.error("translate", j.id, e);
    return json({ error: "Translation didn't work just now. Try again in a minute." }, 502);
  }
}
