import type { Cue } from "@/db";

export type AiConfig = { provider: string; model: string; sttModel: string };

/** Each provider turns one audio chunk (mp3) into chunk-relative Tamil + English cues. */
export type Provider = (audio: Buffer, durationSec: number, cfg: AiConfig) => Promise<Cue[]>;

/** fetch with retries on rate limits / server errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped vendor JSON
export async function postJson(url: string, init: RequestInit, tries = 4): Promise<any> {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { ...init, method: "POST", signal: AbortSignal.timeout(10 * 60e3) });
    if (res.ok) return res.json();
    const body = await res.text();
    if (i >= tries || (res.status !== 429 && res.status < 500)) throw new Error(`AI ${res.status}: ${body.slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2 ** i * 1500));
  }
}

export const SUBTITLE_RULES = `You are a professional subtitler for Tamil films, YouTube and ads.
- One cue = one short spoken phrase, 1–7 seconds, at most ~42 characters per language.
- "ta": Tamil script. If the speaker used Tamil, transcribe it exactly as spoken (colloquial Tamil stays colloquial; common English loanwords may stay in English). If they spoke another language, translate naturally into Tamil.
- "en": a natural English subtitle, not word-for-word. If they spoke English, transcribe it exactly.
- Ignore music, silence and noise. Never invent dialogue.`;
