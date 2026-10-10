import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";

const exec = promisify(execFile);
// Windows can fail to start a child process under memory pressure (0xC0000142, "DLL init failed"); a short retry gets through.
const run = (async (...a: Parameters<typeof exec>) => {
  for (let i = 1; ; i++) {
    try { return await exec(...a); } catch (e) {
      if ((e as { code?: number }).code !== 0xC0000142 || i >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}) as typeof exec;
const bin = (name: string) => (process.env.FFMPEG_DIR ? join(process.env.FFMPEG_DIR, name) : name);

export const STORAGE = resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR || "./storage");
export const CHUNK_SECONDS = 300; // shorter chunks = tighter AI timestamps

/** Duration in seconds, or null if the file has no audio stream / isn't media. */
export async function probe(file: string): Promise<number | null> {
  try {
    const { stdout } = await run(bin("ffprobe"), [
      "-v", "error", "-select_streams", "a:0", "-show_entries", "format=duration", "-of", "csv=p=0", file,
    ]);
    const hasAudio = (await run(bin("ffprobe"), ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file])).stdout.trim();
    const d = parseFloat(stdout);
    return hasAudio && d > 0 ? d : null;
  } catch {
    return null;
  }
}

/** Extract mono 16 kHz speech-quality mp3 split into CHUNK_SECONDS pieces; returns their paths in order. */
export async function extractChunks(file: string, outDir: string) {
  await run(bin("ffmpeg"), [
    "-y", "-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k",
    "-f", "segment", "-segment_time", String(CHUNK_SECONDS), "-reset_timestamps", "1", join(outDir, "c%04d.mp3"),
  ], { maxBuffer: 1 << 24 }).catch((e) => {
    console.error(e); // full ffmpeg command and output stay in the worker log
    throw new Error("Couldn't read the audio in this file. Try uploading it again, or export it as MP4 or MP3.");
  });
  const { readdir } = await import("node:fs/promises");
  return (await readdir(outDir)).filter((f) => f.endsWith(".mp3")).sort().map((f) => join(outDir, f));
}

/**
 * Turn silencedetect output into subtitle-sized speech lines [start, end]:
 * neighbours closer than `join` seconds merge while the line stays within `maxLen`; runs with no pause are cut every `cut` s
 * (long enough to keep whole sentences for the AI; the provider splits the text into readable cues).
 */
export function speechLines(silences: [number, number][], duration: number, maxLen = 7, join = 0.5, cut = 20): [number, number][] {
  const speech: [number, number][] = [];
  let t = 0;
  for (const [a, b] of silences) { if (a - t > 0.25) speech.push([t, a]); t = b; }
  if (duration - t > 0.25) speech.push([t, duration]);
  const lines: [number, number][] = [];
  for (const [a, b] of speech) {
    const last = lines.at(-1);
    if (last && a - last[1] < join && b - last[0] <= maxLen) last[1] = b;
    // shortcut: speech with no pause (or under constant music) is cut every `cut` s, possibly mid-word; upgrade to word timestamps if that shows.
    else for (let x = a; x < b; x += cut) lines.push([x, Math.min(b, x + cut)]);
  }
  return lines;
}

/** Speech lines in an audio file, found from its pauses. */
export async function findSpeech(file: string, duration: number) {
  const { stderr } = await run(bin("ffmpeg"), ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"], { maxBuffer: 1 << 24 });
  const silences: [number, number][] = [];
  let open: number | null = null;
  for (const m of stderr.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    if (m[1] === "start") open = Math.max(0, +m[2]);
    else if (open !== null) { silences.push([open, +m[2]]); open = null; }
  }
  if (open !== null) silences.push([open, duration]);
  return speechLines(silences, duration);
}

/** One slice of an audio file as 16 kHz mono WAV bytes. */
export async function cutAudio(file: string, start: number, end: number) {
  const { stdout } = await run(bin("ffmpeg"), ["-v", "error", "-ss", String(start), "-t", String(end - start), "-i", file, "-ac", "1", "-ar", "16000", "-f", "wav", "-"], { encoding: "buffer", maxBuffer: 1 << 26 });
  return stdout;
}
