import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
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
export const bin = (name: string) => (process.env.FFMPEG_DIR ? join(process.env.FFMPEG_DIR, name) : name);

export const STORAGE = resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR || "./storage");
export const CHUNK_SECONDS = 300; // shorter chunks = tighter AI timestamps

/** Raw AAC (ADTS, from lib/audioTrack.ts) into an M4A: a copy, not a re-encode, so its length is exact. */
export async function remuxAudio(src: string, dst: string) {
  await run(bin("ffmpeg"), ["-y", "-v", "error", "-i", src, "-c", "copy", dst]);
}

/** A video arriving in pieces: the file being filled, and a folder with one marker per piece received. */
export const VIDEO_PIECE = 8 * 1024 * 1024;
export const videoPart = (dir: string, jobId: string) => ({ file: join(dir, `${jobId}.part`), got: join(dir, `${jobId}.got`) });

/** Remove a job's uploaded files: the video, the sound sent first, and a video still arriving in pieces. */
export async function removeUploads(j: { id: string; userId: string; filePath: string | null; audioPath: string | null }) {
  const part = videoPart(join(STORAGE, "uploads", j.userId), j.id);
  for (const f of [j.filePath, j.audioPath, part.file, part.got]) if (f) await rm(f, { recursive: true, force: true }).catch(() => {});
}

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

/** Width and height of the first video stream, or null for audio-only files. */
export async function videoSize(file: string) {
  try {
    const { stdout } = await run(bin("ffprobe"), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]);
    const [width, height] = stdout.trim().split(",").map(Number);
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

export const LEVEL_FRAME = 0.02; // seconds per loudness value

/** Loudness of the whole file in dB, one value per LEVEL_FRAME, or null if it can't be read. Streamed, so hours of audio stay small. */
export async function loudness(file: string): Promise<Float32Array | null> {
  const { spawn } = await import("node:child_process");
  const rate = 8000, per = rate * LEVEL_FRAME;
  return new Promise((done) => {
    const p = spawn(bin("ffmpeg"), ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"]);
    const out: number[] = [];
    let sum = 0, n = 0, odd: Buffer | null = null;
    p.stdout.on("data", (b: Buffer) => {
      if (odd) { b = Buffer.concat([odd, b]); odd = null; }
      const even = b.length & ~1;
      if (even < b.length) odd = b.subarray(even);
      for (let i = 0; i < even; i += 2) {
        const s = b.readInt16LE(i) / 32768;
        sum += s * s;
        if (++n === per) { out.push(10 * Math.log10(sum / n + 1e-10)); sum = 0; n = 0; }
      }
    });
    p.on("error", () => done(null));
    p.on("close", (code) => done(code === 0 && out.length ? Float32Array.from(out) : null));
  });
}
