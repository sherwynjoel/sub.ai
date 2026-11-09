/**
 * What each AI call used (audio seconds, tokens, characters), so the admin can see what the AI really costs.
 * The worker and the translate route collect a call's usage in a Meter and save it when the work ends (also when it
 * fails: a failed call is still billed). Prices live in lib/aiPrices.ts and are applied when the admin page is read,
 * so a corrected price fixes past figures too.
 */
export type Usage = {
  provider: string;
  model: string;
  /** "subtitles" (the AI listening to a video) or "translate" (caption lines translated) */
  kind: "subtitles" | "translate";
  /** Seconds of audio the service heard (billed per hour of audio) */
  audioSec?: number;
  /** Text tokens sent */
  inTok?: number;
  /** Audio tokens sent (Gemini counts the sound as tokens) */
  audioTok?: number;
  /** Tokens written back, thinking included */
  outTok?: number;
  /** Characters sent (billed per 10,000 characters) */
  chars?: number;
};

export class Meter {
  readonly rows: Usage[] = [];
  add(u: Usage) {
    this.rows.push(u);
  }
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);

/** Gemini's usageMetadata: the prompt split by modality (audio is priced higher than text), and output with thinking. */
export function geminiUsage(meta: unknown, model: string): Usage {
  const m = (meta ?? {}) as { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; promptTokensDetails?: { modality?: string; tokenCount?: number }[] };
  const audioTok = n((m.promptTokensDetails ?? []).filter((d) => d.modality === "AUDIO").reduce((a, d) => a + (d.tokenCount ?? 0), 0));
  return { provider: "gemini", model, kind: "subtitles", audioTok, inTok: Math.max(0, n(m.promptTokenCount) - audioTok), outTok: n(m.candidatesTokenCount) + n(m.thoughtsTokenCount) };
}

/**
 * Save a run's usage, one row per model: the AI listening to one video, or one translation. Never throws: a
 * bookkeeping hiccup must not fail the user's video.
 */
export async function saveUsage(meter: Meter, run: { jobId?: string | null; userId?: string | null; videoSec: number }) {
  if (!meter.rows.length) return;
  const byModel = new Map<string, Usage>();
  for (const u of meter.rows) {
    const k = `${u.kind}|${u.provider}|${u.model}`, t = byModel.get(k);
    if (!t) { byModel.set(k, { ...u }); continue; }
    for (const f of ["audioSec", "inTok", "audioTok", "outTok", "chars"] as const) t[f] = (t[f] ?? 0) + (u[f] ?? 0);
  }
  try {
    const { db, aiUsage } = await import("@/db");
    const id = crypto.randomUUID();
    await db.insert(aiUsage).values([...byModel.values()].map((u) => ({
      run: id, videoSec: run.videoSec, jobId: run.jobId ?? null, userId: run.userId ?? null, kind: u.kind, provider: u.provider, model: u.model,
      audioSec: u.audioSec ?? 0, inTok: n(u.inTok), audioTok: n(u.audioTok), outTok: n(u.outTok), chars: n(u.chars),
    })));
  } catch (e) {
    console.error("ai usage not saved", e);
  }
}
