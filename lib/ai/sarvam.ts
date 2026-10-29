import { getSecret } from "@/lib/secrets";
import { layoutCue, pairChunks, type Piece } from "@/lib/subtitles";
import { postJson, type Provider, type Script } from "./shared";

const API = "https://api.sarvam.ai/speech-to-text/job/v1";

/**
 * Sarvam AI (built for Indian languages). Saaras is run twice on the whole chunk through the Batch API, which
 * takes up to 2 h of audio and returns phrase-level timestamps, so nothing is cut at silences: once in code-mix
 * mode (Tanglish, Hinglish and the like stay as spoken) and once in translate mode (English). The two are paired by
 * time. (Text translation, sentence by sentence, was tried: sarvam-translate and Mayura both mistranslated
 * code-mixed Tamil far more often than Saaras translating the speech.)
 */
export const sarvam: Provider = async (audio, _dur, cfg, lang, want) => {
  const key = await getSecret("SARVAM_API_KEY");
  if (!key) throw new Error("No Sarvam API key: set SARVAM_API_KEY in the server's .env.local.");
  const [native, english = []] = await Promise.all(passesFor(want.script, want.english).map((mode) => batch(audio, key, cfg.model, mode, lang)));
  // Saaras windows are 10–30 s, so each paired window is cut into readable cues by sentence (English sentences matched
  // to the native sentences they translate).
  return pairChunks(native, english).flatMap((c) => layoutCue(c));
};

const MODE = { mixed: "codemix", roman: "translit", native: "transcribe" } as const;
type Mode = (typeof MODE)[Script] | "translate";

/** Saaras modes to run: one for the main line's script, plus translate when an English line is wanted. */
export const passesFor = (script: Script, english: boolean): Mode[] => [MODE[script], ...(english ? ["translate" as const] : [])];

/** One Batch STT job: create → upload → start → poll → download. Returns the timestamped phrases. */
async function batch(audio: Buffer, key: string, model: string, mode: Mode, lang: string): Promise<Piece[]> {
  const headers = { "api-subscription-key": key, "content-type": "application/json" };
  const { job_id } = await postJson(API, { headers, body: JSON.stringify({ job_parameters: { model, mode, language_code: lang, with_timestamps: true, input_audio_codec: "mp3" } }) });
  const up = await postJson(`${API}/upload-files`, { headers, body: JSON.stringify({ job_id, files: ["chunk.mp3"] }) });
  // Sarvam's presigned URLs are Azure blobs; the blob-type header is what their own SDK sends.
  const put = await fetch(up.upload_urls["chunk.mp3"].file_url, { method: "PUT", body: new Uint8Array(audio), headers: { "x-ms-blob-type": "BlockBlob", "content-type": "audio/mpeg" } });
  if (!put.ok) throw new Error(`AI service error ${put.status}: upload to Sarvam failed`);
  await postJson(`${API}/${job_id}/start`, { headers });
  let status;
  for (const t0 = Date.now(); ; ) {
    await new Promise((r) => setTimeout(r, 3000));
    status = await fetch(`${API}/${job_id}/status`, { headers }).then((r) => r.json()).catch(() => ({}));
    if (status.job_state === "Completed") break;
    if (status.job_state === "Failed" || Date.now() - t0 > 20 * 60e3) throw new Error(`AI service error: Sarvam job ${status.job_state ?? "timed out"}: ${status.error_message ?? ""}`);
  }
  const detail = status.job_details?.[0];
  if (detail?.state !== "Success") throw new Error(`AI service error: Sarvam could not process the audio: ${detail?.error_message ?? detail?.state ?? "no result"}`);
  const name = detail.outputs[0].file_name;
  let dl;
  for (let i = 1; ; i++) {
    try { dl = await postJson(`${API}/download-files`, { headers, body: JSON.stringify({ job_id, files: [name] }) }); break; }
    catch (e) { // the status endpoint says Completed a moment before the download endpoint agrees
      if (i >= 5 || !/not in COMPLETED/.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const out = await fetch(dl.download_urls[name].file_url).then((r) => r.json());
  const ts = out.timestamps ?? {};
  return (ts.words ?? ts.chunks ?? []) // the phrases arrive under "words" (10–30 s windows), docs say "chunks"
    .map((text: string, i: number): Piece => ({ start: ts.start_time_seconds[i], end: ts.end_time_seconds[i], text: String(text).trim() }))
    .filter((p: Piece) => p.text);
}
