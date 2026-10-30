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

/**
 * Raw AAC (ADTS, from lib/audioTrack.ts) into an M4A with an exact length: a copy, or, when the video's edit list
 * moves its sound (`shift` seconds, see audioTrack), this listening copy re-encoded with the gap added or the
 * skipped start cut, so captions line up with the video as it plays. The video itself is never touched.
 */
export async function remuxAudio(src: string, dst: string, shift = 0) {
  const ms = Math.round(shift * 1000);
  const fx = ms > 0 ? ["-af", `adelay=${ms}:all=1`] : ms < 0 ? ["-af", `atrim=start=${(-ms / 1000).toFixed(3)},asetpts=PTS-STARTPTS`] : [];
  await run(bin("ffmpeg"), ["-y", "-v", "error", "-i", src, ...(fx.length ? [...fx, "-c:a", "aac", "-b:a", "128k"] : ["-c", "copy"]), dst]);
}

/** A video arriving in pieces: the file being filled, and a folder with one marker per piece received. */
export const VIDEO_PIECE = 4 * 1024 * 1024; // small enough that a dropped connection loses little
export const videoPart = (dir: string, jobId: string) => ({ file: join(dir, `${jobId}.part`), got: join(dir, `${jobId}.got`) });

/** Remove a job's uploaded files: the video, the sound sent first, and a video still arriving in pieces. */
export async function removeUploads(j: { id: string; userId: string; filePath: string | null; audioPath: string | null; previewPath?: string | null }) {
  const part = videoPart(join(STORAGE, "uploads", j.userId), j.id);
  for (const f of [j.filePath, j.audioPath, j.previewPath, part.file, part.got]) if (f) await rm(f, { recursive: true, force: true }).catch(() => {});
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

/**
 * How long the sound really is, counted packet by packet (a copy, no decoding: seconds even for an hour). The length
 * a file states can be made up: a raw AAC is only estimated from its first frames, so loud frames first and quiet
 * ones after state a fraction of the real length. Charging uses the longer of the two. Null if it can't be read.
 */
export async function soundLength(file: string): Promise<number | null> {
  try {
    const { stdout } = await run(bin("ffmpeg"), ["-nostdin", "-v", "error", "-i", file, "-map", "0:a:0", "-c", "copy", "-f", "null", "-progress", "pipe:1", "-"], { maxBuffer: 1 << 26 });
    const us = [...stdout.matchAll(/^out_time_us=(\d+)/gm)].at(-1)?.[1];
    return us ? +us / 1e6 : null;
  } catch {
    return null;
  }
}

/**
 * Extract mono 16 kHz speech-quality mp3 split into CHUNK_SECONDS pieces; returns their paths in order. `maxSeconds`:
 * no more than the minutes paid for are listened to, whatever the file claims.
 */
export async function extractChunks(file: string, outDir: string, maxSeconds?: number) {
  await run(bin("ffmpeg"), [
    "-y", "-v", "error", "-i", file, ...(maxSeconds ? ["-t", String(maxSeconds)] : []), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k",
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

/** The codec of a file's first audio stream ("aac", "opus", …), or null. */
export async function audioCodec(file: string) {
  try {
    const { stdout } = await run(bin("ffprobe"), ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", file]);
    return stdout.trim() || null;
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

/**
 * The copy the editor plays: phones record 1080p/4K at 20–60 Mbit/s, often HEVC, which streams in fits and starts
 * (and HEVC doesn't play in many browsers). This one is H.264 at most 720p on its short side and ~2 Mbit/s, a
 * keyframe every second for quick seeking, its index first so it starts at once. Exports still use the original.
 * Returns false when the original is already light enough to play as it is (or has no picture).
 */
export async function makePreview(src: string, dst: string) {
  const { stdout } = await run(bin("ffprobe"), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height:format=duration,size", "-of", "json", src]);
  const info = JSON.parse(stdout) as { streams?: { codec_name?: string; width?: number; height?: number }[]; format?: { duration?: string; size?: string } };
  const v = info.streams?.[0];
  if (!v?.width || !v.height) return false; // sound only
  const mbps = (Number(info.format?.size) * 8) / Math.max(1, Number(info.format?.duration)) / 1e6;
  if (v.codec_name === "h264" && Math.min(v.width, v.height) <= 720 && mbps <= 3) return false;
  await run(bin("ffmpeg"), [
    "-y", "-v", "error", "-i", src, "-map", "0:v:0", "-map", "0:a:0?",
    "-vf", "scale=w='if(gt(iw,ih),-2,min(720,iw))':h='if(gt(iw,ih),min(720,ih),-2)',format=yuv420p", "-fpsmax", "30",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-maxrate", "2500k", "-bufsize", "5000k",
    "-force_key_frames", "expr:gte(t,n_forced*1)",
    "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", dst,
  ], { maxBuffer: 1 << 24 });
  return true;
}
