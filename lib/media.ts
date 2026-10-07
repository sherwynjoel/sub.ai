import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";

const run = promisify(execFile);
const bin = (name: string) => (process.env.FFMPEG_DIR ? join(process.env.FFMPEG_DIR, name) : name);

export const STORAGE = resolve(process.env.STORAGE_DIR || "./storage");
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
  ], { maxBuffer: 1 << 24 });
  const { readdir } = await import("node:fs/promises");
  return (await readdir(outDir)).filter((f) => f.endsWith(".mp3")).sort().map((f) => join(outDir, f));
}
