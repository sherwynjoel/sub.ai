import type { Cue } from "@/db";

export type AiConfig = { provider: string; model: string; sttModel: string };

/** How the main line is written: native script with English words kept (mixed), Roman letters (Tanglish), or native script only. */
export const SCRIPTS = ["mixed", "roman", "native"] as const;
export type Script = (typeof SCRIPTS)[number];
/** What the user asked for: the main line's script, and whether an English line is wanted. */
export type Want = { script: Script; english: boolean };

/** Each provider turns one audio chunk (mp3) into chunk-relative cues: `ta` in `lang` (a lib/languages code), `en` in English. */
export type Provider = (audio: Buffer, durationSec: number, cfg: AiConfig, lang: string, want: Want) => Promise<Cue[]>;

/** fetch with retries on rate limits / server errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped vendor JSON
export async function postJson(url: string, init: RequestInit, tries = 4): Promise<any> {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { ...init, method: "POST", signal: AbortSignal.timeout(10 * 60e3) });
    if (res.ok) return res.json();
    const body = await res.text();
    if (i >= tries || (res.status !== 429 && res.status < 500)) {
      let detail = body;
      try { detail = JSON.parse(body).error?.message ?? body; } catch { /* not JSON */ }
      throw new Error(`AI service error ${res.status}: ${String(detail).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 2 ** i * 1500));
  }
}

const SCRIPT_RULE: Record<Script, (language: string) => string> = {
  mixed: (l) => `${l} in its native script; common English loanwords may stay in English`,
  roman: (l) => `${l} written in Roman letters, the way ${l} speakers type it in chats; English words stay English`,
  native: (l) => `only ${l} script, with English words spelled out in ${l} letters`,
};

export const subtitleRules = (language: string, script: Script) => `You are a professional subtitler for ${language} films, YouTube and ads.
- One cue = one short spoken phrase, 1–7 seconds, at most ~42 characters per language.
- "ta": ${SCRIPT_RULE[script](language)}. If the speaker used ${language}, transcribe it exactly as spoken (colloquial speech stays colloquial). If they spoke another language, translate naturally into ${language}.
- "en": a natural English subtitle, not word-for-word. If they spoke English, transcribe it exactly.
- Ignore music, silence and noise. Never invent dialogue.`;
