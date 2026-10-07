import { postJson, SUBTITLE_RULES, type AiConfig } from "./shared";
import type { Cue } from "@/db";

/**
 * Any OpenAI-compatible API (OpenAI, Groq, OpenRouter, local servers):
 * 1) Whisper-style transcription gives timed segments, 2) a chat model writes Tamil + English for each.
 */
export async function openaiCompatible(audio: Buffer, _dur: number, cfg: AiConfig, api: { baseUrl: string; apiKey: string }): Promise<Cue[]> {
  if (!api.baseUrl || !api.apiKey) throw new Error(`API key or URL for "${cfg.provider}" is not set. Add it in Admin → Connections.`);
  const auth = { authorization: `Bearer ${api.apiKey}` };

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), "chunk.mp3");
  form.append("model", cfg.sttModel);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  const stt = await postJson(`${api.baseUrl}/audio/transcriptions`, { headers: auth, body: form });
  const segs: { start: number; end: number; text: string }[] = (stt.segments ?? []).filter((s: { text: string }) => s.text.trim());
  if (!segs.length) return [];

  const chat = await postJson(`${api.baseUrl}/chat/completions`, {
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SUBTITLE_RULES}\nYou receive transcript segments (speech-to-text, may contain errors — fix obvious ones). Reply with JSON {"cues":[{"i":number,"ta":string,"en":string}]} with exactly one entry per input segment.` },
        { role: "user", content: JSON.stringify(segs.map((s, i) => ({ i, text: s.text.trim() }))) },
      ],
    }),
  });
  const out: { i: number; ta: string; en: string }[] = JSON.parse(chat.choices[0].message.content).cues ?? [];
  const byIndex = new Map(out.map((c) => [c.i, c]));
  return segs.map((s, i) => ({ start: s.start, end: s.end, ta: byIndex.get(i)?.ta ?? s.text, en: byIndex.get(i)?.en ?? "" }));
}
