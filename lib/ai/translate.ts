import { getSecret } from "@/lib/secrets";
import { postJson } from "./shared";

const API = "https://api.sarvam.ai/translate";
/** Mayura translates into everyday speech ("modern-colloquial"), better for captions; Sarvam-Translate covers all 22 languages. */
const MAYURA = ["bn-IN", "gu-IN", "hi-IN", "kn-IN", "ml-IN", "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN"];

/**
 * English lines translated into `lang` with Sarvam's text translation, four at a time; empty lines stay empty.
 * (Used for English speech; translating code-mixed Tamil into English this way went wrong too often, see sarvam.ts.)
 */
export async function translateLines(lines: string[], lang: string): Promise<string[]> {
  const key = await getSecret("SARVAM_API_KEY");
  if (!key) throw new Error("Translation needs a Sarvam API key. Add it in /admin → Connections.");
  const mayura = MAYURA.includes(lang);
  const out: string[] = lines.map(() => "");
  const queue = lines.map((l, i) => i).filter((i) => lines[i].trim());
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let i; (i = queue.shift()) !== undefined; ) {
      const r = await postJson(API, {
        headers: { "api-subscription-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          input: lines[i].slice(0, 1000), source_language_code: "en-IN", target_language_code: lang,
          model: mayura ? "mayura:v1" : "sarvam-translate:v1", ...(mayura ? { mode: "modern-colloquial" } : {}),
        }),
      });
      out[i] = String(r.translated_text ?? "").trim();
    }
  }));
  return out;
}
