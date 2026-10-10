import { db, settings } from "@/db";
import type { AiConfig, Provider } from "./shared";
import { gemini } from "./gemini";
import { openaiCompatible } from "./openai";
import { sarvam } from "./sarvam";
import { getSecret } from "@/lib/secrets";

export type { AiConfig };

const OPENAI_LIKE = {
  openai: { baseUrl: "https://api.openai.com/v1", key: "OPENAI_API_KEY", stt: "whisper-1", llm: "gpt-4.1-mini" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", key: "GROQ_API_KEY", stt: "whisper-large-v3-turbo", llm: "llama-3.3-70b-versatile" },
  custom: { baseUrl: "", key: "AI_API_KEY", stt: "whisper-1", llm: "" }, // base URL comes from AI_BASE_URL
} as const;

export const PROVIDERS = ["gemini", "sarvam", "openai", "groq", "custom"] as const;
export const DEFAULT_MODELS: Record<string, { model: string; sttModel: string }> = {
  gemini: { model: "gemini-2.5-flash", sttModel: "" },
  sarvam: { model: "sarvam-translate:v1", sttModel: "saaras:v3" }, // codemix mode needs saaras:v3
  ...Object.fromEntries(Object.entries(OPENAI_LIKE).map(([k, v]) => [k, { model: v.llm, sttModel: v.stt }])),
};

/** Admin-chosen settings win over env so the model can be switched without a redeploy. */
export async function getAiConfig(): Promise<AiConfig> {
  const rows = Object.fromEntries((await db.select().from(settings)).map((r) => [r.key, r.value]));
  const provider = rows.ai_provider || process.env.AI_PROVIDER || "gemini";
  const d = DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.gemini;
  return {
    provider,
    model: rows.ai_model || process.env.AI_MODEL || d.model,
    sttModel: rows.ai_stt_model || process.env.AI_STT_MODEL || d.sttModel,
  };
}

export async function saveAiConfig(cfg: AiConfig) {
  for (const [key, value] of Object.entries({ ai_provider: cfg.provider, ai_model: cfg.model, ai_stt_model: cfg.sttModel }))
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export const transcribe: Provider = async (audio, dur, cfg, lang) => {
  if (cfg.provider === "gemini") return gemini(audio, dur, cfg, lang);
  if (cfg.provider === "sarvam") return sarvam(audio, dur, cfg, lang);
  const api = await openaiApi(cfg.provider);
  return openaiCompatible(audio, dur, cfg, api, lang);
};

/** Base URL + key for an OpenAI-style provider (also used by the admin "Test" button). */
export async function openaiApi(provider: string) {
  const p = OPENAI_LIKE[provider as keyof typeof OPENAI_LIKE];
  if (!p) throw new Error(`Unknown AI provider "${provider}"`);
  const baseUrl = provider === "custom" ? (await getSecret("AI_BASE_URL")).replace(/\/+$/, "") : p.baseUrl;
  return { baseUrl, apiKey: await getSecret(p.key) };
}
