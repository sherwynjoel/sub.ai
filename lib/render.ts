import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { Cue } from "@/db";
import { buildAss, type CaptionCustom } from "@/lib/captionStyles";
import { bin, STORAGE, videoSize } from "@/lib/media";

const FONTS = resolve(/*turbopackIgnore: true*/ process.cwd(), "public", "caption-fonts");

type Job = { id: string; filePath: string; durationSec: number; cues: Cue[]; captionStyle: string; captionCustom: CaptionCustom; renderLang: string };

/**
 * Burns the job's captions into an MP4 in its caption style (libass via ffmpeg's subtitles filter).
 * Audio-only uploads get a plain dark 1920x1080 canvas. Returns the output path.
 */
export async function renderStyled(job: Job, onProgress: (pct: number) => void) {
  const size = await videoSize(job.filePath);
  const { width, height } = size ?? { width: 1920, height: 1080 };
  const lang = (["ta", "en", "both"].includes(job.renderLang) ? job.renderLang : "both") as "ta" | "en" | "both";
  const dir = await mkdtemp(join(tmpdir(), "vasanam-render-"));
  const outDir = join(STORAGE, "renders");
  await mkdir(outDir, { recursive: true });
  const out = join(outDir, `${job.id}.mp4`);
  try {
    await writeFile(join(dir, "subs.ass"), buildAss(job.cues, { styleId: job.captionStyle, custom: job.captionCustom, lang, width, height }), "utf8");
    // Relative paths keep Windows drive colons out of the filter string, which ffmpeg would misparse.
    await cp(FONTS, join(dir, "fonts"), { recursive: true });
    const input = size
      ? ["-i", job.filePath]
      : ["-f", "lavfi", "-i", `color=c=0x0c0c14:s=${width}x${height}:r=30`, "-i", job.filePath, "-shortest"];
    const args = [
      "-y", "-v", "error", "-nostats", "-progress", "pipe:1", ...input,
      "-vf", "subtitles=subs.ass:fontsdir=fonts",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out,
    ];
    await new Promise<void>((ok, fail) => {
      const p = spawn(bin("ffmpeg"), args, { cwd: dir });
      let err = "";
      p.stderr.on("data", (d) => { err = (err + d).slice(-2000); });
      p.stdout.on("data", (d) => {
        const m = String(d).match(/out_time_us=(\d+)/g)?.pop();
        if (m) onProgress(Math.min(99, Math.round((+m.split("=")[1] / 1e6 / Math.max(1, job.durationSec)) * 100)));
      });
      p.on("error", fail);
      p.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}: ${err.trim()}`))));
    });
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
