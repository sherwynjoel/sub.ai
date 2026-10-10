import type { Cue } from "@/db";

export type AiConfig = { provider: string; model: string; sttModel: string };

/** Each provider turns one audio chunk (mp3) into chunk-relative cues: `ta` in `lang` (a lib/languages code), `en` in English. */
export type Provider = (audio: Buffer, durationSec: number, cfg: AiConfig, lang: string) => Promise<Cue[]>;

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

export const subtitleRules = (language: string) => `You are a professional subtitler for ${language} films, YouTube and ads.
- One cue = one short spoken phrase, 1–7 seconds, at most ~42 characters per language.
- "ta": ${language} in its native script. If the speaker used ${language}, transcribe it exactly as spoken (colloquial speech stays colloquial; common English loanwords may stay in English). If they spoke another language, translate naturally into ${language}.
- "en": a natural English subtitle, not word-for-word. If they spoke English, transcribe it exactly.
- Ignore music, silence and noise. Never invent dialogue.`;
