import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Cue } from "@/db";
import { cutAudio, findSpeech } from "@/lib/media";
import { getSecret } from "@/lib/secrets";
import { divide, splitLine } from "@/lib/subtitles";
import { postJson, type Provider } from "./shared";

const API = "https://api.sarvam.ai";
const LANES = 4; // speech lines in flight per chunk

/**
 * Sarvam AI (built for Indian languages). Its REST speech-to-text takes at most 30 s and returns coarse timing,
 * so the chunk is cut at pauses into subtitle lines; each line is transcribed in code-mix mode (Tanglish, Hinglish and the like stay as spoken)
 * and translated into the other language.
 */
export const sarvam: Provider = async (audio, dur, cfg, lang) => {
  const key = await getSecret("SARVAM_API_KEY");
  if (!key) throw new Error("No Sarvam API key saved. Add it in /admin → Connections.");
  const headers = { "api-subscription-key": key };
  const dir = await mkdtemp(join(tmpdir(), "sarvam-"));
  try {
    const src = join(dir, "chunk.mp3");
    await writeFile(src, audio);
    const lines = await findSpeech(src, dur);
    const cues: Cue[][] = lines.map(() => []);
    let next = 0;
    await Promise.all(Array.from({ length: LANES }, async () => {
      for (let i; (i = next++) < lines.length; ) {
        const [start, end] = lines[i];
        const form = new FormData();
        form.append("file", new Blob([new Uint8Array(await cutAudio(src, start, end))], { type: "audio/wav" }), "line.wav");
        form.append("model", cfg.sttModel);
        form.append("mode", "codemix");
        form.append("language_code", lang);
        const stt = await postJson(`${API}/speech-to-text`, { headers, body: form });
        const text = String(stt.transcript ?? "").trim();
        if (!text) continue; // music or noise
        // A line with no Indian-script letters is English speech: translate it into the project language instead.
        const english = !/[^\x00-\x7F]/.test(text);
        // A line can hold several sentences (no pauses under music). Translate whole sentences for context,
        // then cut each into readable cues and share the translation across them.
        const sentences = splitLine(text, start, end, 2000); // max 2000 = break only at sentence ends
        const per = await Promise.all(sentences.map(async (s) => {
          const tr = await postJson(`${API}/translate`, {
            headers: { ...headers, "content-type": "application/json" },
            body: JSON.stringify({
              input: s.text,
              source_language_code: english ? "en-IN" : lang,
              target_language_code: english ? lang : "en-IN",
              model: cfg.model,
            }),
          });
          const pieces = splitLine(s.text, s.start, s.end);
          const other = divide(String(tr.translated_text ?? "").trim(), pieces.map((p) => p.text.length));
          return pieces.map((p, k) => ({ start: p.start, end: p.end, ta: english ? other[k] : p.text, en: english ? p.text : other[k] }));
        }));
        cues[i] = per.flat();
      }
    }));
    return cues.flat();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};
