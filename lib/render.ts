import { spawn } from "node:child_process";
import { access, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { Cue } from "@/db";
import { BLENDS, buildAss, canvasSize, maskAss, resolveStyle, type CaptionCustom } from "@/lib/captionStyles";
import { audioCodec, bin, STORAGE, videoSize } from "@/lib/media";
import { englishCues } from "@/lib/subtitles";

const FONTS = resolve(/*turbopackIgnore: true*/ process.cwd(), "public", "caption-fonts");

type Job = { id: string; filePath: string; durationSec: number; cues: Cue[]; captionStyle: string; captionCustom: CaptionCustom; renderLang: string };

/**
 * Burns the job's captions into an MP4 in its caption style (libass via ffmpeg's subtitles filter).
 * Audio-only uploads get a plain dark 1920x1080 canvas. Returns the output path.
 */
export async function renderStyled(job: Job, onProgress: (pct: number) => void) {
  const size = await videoSize(job.filePath);
  const src = size ?? { width: 1920, height: 1080 };
  const canvas = job.captionCustom?.canvas;
  const { width, height } = canvasSize(canvas, src.width, src.height); // the exported frame
  const lang = (["ta", "en", "both"].includes(job.renderLang) ? job.renderLang : "both") as "ta" | "en" | "both";
  const dir = await mkdtemp(join(tmpdir(), "vasanam-render-"));
  const outDir = join(STORAGE, "renders");
  await mkdir(outDir, { recursive: true });
  const out = join(outDir, `${job.id}.mp4`);
  try {
    const ass = buildAss(lang === "en" ? englishCues(job.cues) : job.cues, { styleId: job.captionStyle, custom: job.captionCustom, lang, width, height });
    // A blended look: the text is a window onto the video blended with the text colour (Negative: inverted).
    const look = resolveStyle(job.captionStyle, job.captionCustom), blend = look.blend;
    await writeFile(join(dir, "subs.ass"), blend ? maskAss(ass) : ass, "utf8");
    // Relative paths keep Windows drive colons out of the filter string, which ffmpeg would misparse.
    await cp(FONTS, join(dir, "fonts"), { recursive: true });
    const input = size
      ? ["-i", job.filePath]
      : ["-f", "lavfi", "-i", `color=c=0x0c0c14:s=${width}x${height}:r=30`, "-i", job.filePath, "-shortest"];
    const audio = size ? "0:a?" : "1:a?";
    // Phone videos' sound is AAC already: copied as it is (no quality lost, less work); anything else is encoded.
    const copyAudio = !!size && (await audioCodec(job.filePath)) === "aac";
    const logo = await logoFile(job);
    const graph = [frame(canvas, width, height, !!size)];
    let last = "framed";
    if (logo) {
      const l = job.captionCustom.logo!;
      input.push("-i", logo);
      const w = Math.max(8, Math.round((width * l.size) / 2) * 2);
      graph.push(`[${size ? 1 : 2}:v]scale=${w}:-2,format=rgba,colorchannelmixer=aa=${l.opacity}[logo]`);
      graph.push(`[${last}][logo]overlay=x=${Math.round(l.x * width)}-w/2:y=${Math.round(l.y * height)}-h/2[logoed]`);
      last = "logoed";
    }
    // The ass filter with complex shaping: Tamil and other Indic scripts need it (otherwise vowel signs like ே land
    // after the consonant instead of before it). The server also needs a font with the script (fonts-noto-core).
    if (blend) graph.push(blendGraph(last, BLENDS[blend][2], look.color));
    else graph.push(`[${last}]ass=subs.ass:fontsdir=fonts:shaping=complex[out]`);
    const args = [
      "-y", "-v", "error", "-nostats", "-progress", "pipe:1", ...input,
      "-filter_complex", graph.join(";"), "-map", "[out]", "-map", audio,
      // superfast at CRF 22: measured on a 1080x1920 phone clip on the server, 35% faster than veryfast/CRF 20 at
      // the same picture quality (SSIM 0.9797 vs 0.9794 against the lossless render), files ~30% larger.
      "-c:v", "libx264", "-preset", "superfast", "-crf", "22", "-pix_fmt", "yuv420p",
      ...(copyAudio ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "160k"]), "-movflags", "+faststart", out,
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

/**
 * The text blended into the video: the frame blended (in RGB) with a layer of the text colour, shown only where the
 * captions' mask (subs.ass drawn white on black) is. Output label [out].
 */
export function blendGraph(from: string, mode: string, color: string) {
  const c = `0x${color.slice(1, 7)}`;
  return `[${from}]split=3[bv][bc][bm];` +
    `[bc]format=gbrp,drawbox=x=0:y=0:w=iw:h=ih:color=${c}:t=fill[bcol];[bv]format=gbrp[bvid];` +
    `[bvid][bcol]blend=all_mode=${mode}[bl];` +
    `[bm]split[bm1][bm2];[bm1]format=rgb24,drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill,ass=subs.ass:fontsdir=fonts:shaping=complex,format=gray[mask];` +
    `[bl][mask]alphamerge[blm];[bm2][blm]overlay=format=auto[out]`;
}

/** The uploaded logo of a job, when it has one. */
async function logoFile(job: Job) {
  const l = job.captionCustom?.logo;
  if (!l) return null;
  const f = logoPath(job.id, l.ext);
  return access(f).then(() => f, () => null);
}

export const logoPath = (id: string, ext: string) => join(STORAGE, "logos", `${id}.${ext}`);

/**
 * The video in the exported frame: as it is, filling the shape (cropped), or fitting inside it on a colour or on a
 * blurred, filled copy of itself. Output label [framed].
 */
function frame(canvas: CaptionCustom["canvas"], w: number, h: number, video: boolean) {
  if (!video || !canvas || canvas.ratio === "source") return "[0:v]setsar=1[framed]";
  if (canvas.fit === "fill") return `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1[framed]`;
  if (canvas.bg !== "blur") return `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x${canvas.bg.slice(1)},setsar=1[framed]`;
  return `[0:v]split[a][b];[a]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=24:2[bg];` +
    `[b]scale=${w}:${h}:force_original_aspect_ratio=decrease:force_divisible_by=2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[framed]`;
}
