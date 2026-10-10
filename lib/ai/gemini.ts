import { languageOf } from "@/lib/languages";
import { getSecret } from "@/lib/secrets";
import { postJson, subtitleRules, type Provider } from "./shared";

const schema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: { start: { type: "NUMBER" }, end: { type: "NUMBER" }, ta: { type: "STRING" }, en: { type: "STRING" } },
    required: ["start", "end", "ta", "en"],
    propertyOrdering: ["start", "end", "ta", "en"],
  },
};

/** Gemini hears the audio directly and returns timed <language> + English cues in a single call. */
export const gemini: Provider = async (audio, dur, cfg, lang) => {
  const key = await getSecret("GEMINI_API_KEY");
  if (!key) throw new Error("Gemini API key is not set. Add it in Admin → Connections.");
  const prompt = `${subtitleRules(languageOf(lang).name)}
Listen to this ${dur.toFixed(1)}-second audio clip and return subtitle cues for ALL speech, in order.
"start"/"end" are seconds from the start of this clip (decimals allowed, between 0 and ${dur.toFixed(1)}), aligned tightly to when the words are spoken. Return [] if there is no speech.`;
  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
    {
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: "audio/mp3", data: audio.toString("base64") } }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
      }),
    },
  );
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") || "[]";
  return JSON.parse(text);
};
