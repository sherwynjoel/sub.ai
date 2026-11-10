import { eq } from "drizzle-orm";
import { db, jobs, type Cue } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { isLanguage, languageOf } from "@/lib/languages";
import { translateLines } from "@/lib/ai/translate";
import { Meter, saveUsage } from "@/lib/ai/usage";
import { alertOn, checkHealth, noteAiError, noteAiWorked } from "@/lib/health";
import { charge, logUse, refund } from "@/lib/credits";
import { minSec, outOfMinutes, passExpired, secondsLeft } from "@/lib/plans";

type Ctx = { params: Promise<{ id: string }> };

// Each translation is paid for (Sarvam): at most 6 an account in any 10 minutes (one server, so kept in memory).
const WINDOW = 10 * 60 * 1000, LIMIT = 6;
const recent = new Map<string, number[]>();
function allowed(user: string, now = Date.now()) {
  const times = (recent.get(user) ?? []).filter((t) => now - t < WINDOW);
  if (times.length >= LIMIT) { recent.set(user, times); return false; }
  recent.set(user, [...times, now]);
  return true;
}

/**
 * Translate the captions: `{ lang }`, an Indian language code or "en-IN".
 * Into English: the main line translated into the English line (added if the project had none).
 * Into another language: the main line becomes that language, translated from the English line when there is one
 * (the better source), else from the main line; the project's language becomes it. Times stay; a translated line's
 * word times, colours and looks go (its words are new). Each translation uses the video's length from the user's
 * minutes (given back if it fails).
 */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (j.status !== "done" || !j.cues?.length) return json({ error: "Subtitles aren't ready yet." }, 409);
  const { lang } = await req.json().catch(() => ({}));
  if (lang !== "en-IN" && !isLanguage(lang)) return json({ error: "Pick a language." }, 400);
  if (!allowed(u.id)) return json({ error: "That's a lot of translations in a short time. Try again in a few minutes." }, 429);
  const cues = j.cues as Cue[];
  const hasEn = cues.some((c) => c.en.trim()), hasMain = cues.some((c) => c.ta.trim());
  const from = lang === "en-IN" ? j.language : hasEn ? "en-IN" : j.language;
  if (lang === "en-IN" ? !hasMain : !hasEn && !hasMain) return json({ error: "There's no caption line to translate." }, 409);
  if (lang !== "en-IN" && from === lang) return json({ error: `The captions are in ${languageOf(lang).name} already.` }, 409);
  if (!(await charge(u, j.durationSec))) {
    if (passExpired(u)) return json({ error: outOfMinutes(u) }, 402);
    return json({ error: `A translation uses ${minSec(j.durationSec)} (the video's length), but you have ${minSec(secondsLeft(u))} left. Upgrade to continue.` }, 402);
  }
  const into = lang === "en-IN" ? "English" : languageOf(lang).name;
  await logUse(u.id, j.durationSec, { jobId: j.id, video: j.filename, kind: "translate", detail: `Into ${into}` });
  const meter = new Meter();
  try {
    if (lang === "en-IN") {
      const out = await translateLines(cues.map((c) => c.ta), "en-IN", j.language, meter);
      const next = cues.map((c, i) => { const n: Cue = { ...c, en: out[i] }; delete n.we; delete n.wce; delete n.wfe; return n; });
      const show = j.captionCustom?.show === "ta" ? { ...j.captionCustom, show: "both" as const } : j.captionCustom;
      await db.update(jobs).set({ cues: next, withEnglish: true, captionCustom: show, updatedAt: new Date() }).where(eq(jobs.id, j.id));
      await noteAiWorked();
      return json({ ok: true, language: "English" });
    }
    const out = await translateLines(cues.map((c) => (hasEn ? c.en : c.ta)), lang, from, meter);
    const next = cues.map((c, i) => { const n: Cue = { ...c, ta: out[i] }; delete n.w; delete n.wc; delete n.wf; return n; });
    await db.update(jobs).set({ cues: next, language: lang, script: "translated", updatedAt: new Date() }).where(eq(jobs.id, j.id));
    await noteAiWorked();
    return json({ ok: true, language: languageOf(lang).name });
  } catch (e) {
    console.error("translate", j.id, e);
    if (await noteAiError(e)) await alertOn("alert_site", (await checkHealth()).problems).catch(() => {});
    await refund(u.id, j.durationSec, { jobId: j.id, video: j.filename, kind: "refund", detail: "The translation didn't work" }); // nothing came of it
    return json({ error: "Translation didn't work just now. Try again in a minute." }, 502);
  } finally {
    await saveUsage(meter, { jobId: j.id, userId: u.id, videoSec: j.durationSec });
  }
}
