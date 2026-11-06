import { spawn } from "node:child_process";
import { access, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { audioCodec, bin, STORAGE, videoRate, videoSize } from "@/lib/media";
import { exportPlan, LOGO, OUT, overlayPlan, VIDEO, type Plan, type RenderJob } from "@/lib/renderPlan";

export const FONTS = resolve(/*turbopackIgnore: true*/ process.cwd(), "public", "caption-fonts");
type Job = RenderJob & { id: string; filePath: string; durationSec: number };

/** Carries out a plan (lib/renderPlan.ts) here, with the machine's ffmpeg. */
async function run(plan: Plan, job: Job, logo: string | null, out: string, onProgress: (pct: number) => void) {
  const dir = await mkdtemp(join(tmpdir(), "vasanam-render-"));
  try {
    await cp(FONTS, join(dir, "fonts"), { recursive: true });
    await Promise.all(Object.entries(plan.files).map(([name, text]) => writeFile(join(dir, name), text)));
    const args = plan.args.map((a) => (a === VIDEO ? job.filePath : a === LOGO ? logo! : a === OUT ? out : a));
    await ffmpeg(["-y", "-v", "error", "-nostats", "-progress", "pipe:1", ...args], dir, job.durationSec, onProgress);
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The styled MP4, for the style preview pictures (scripts/style-previews.mts). Users' exports are made on their devices. */
export async function renderStyled(job: Job, onProgress: (pct: number) => void) {
  const size = await videoSize(job.filePath), logo = await logoFile(job);
  const dir = join(STORAGE, "renders");
  await mkdir(dir, { recursive: true });
  const plan = exportPlan(job, { size, aac: !!size && (await audioCodec(job.filePath)) === "aac", logo: !!logo });
  return run(plan, job, logo, join(dir, `${job.id}.mp4`), onProgress);
}

/** The Adobe panel's transparent captions. */
export async function renderOverlay(job: Job, onProgress: (pct: number) => void) {
  const size = await videoSize(job.filePath), logo = await logoFile(job);
  const dir = join(STORAGE, "overlays");
  await mkdir(dir, { recursive: true });
  const plan = overlayPlan(job, { size, rate: (await videoRate(job.filePath)) ?? "30", logo: !!logo, seconds: job.durationSec });
  return run(plan, job, logo, join(dir, `${job.id}.mov`), onProgress);
}

/** Runs ffmpeg in dir, reporting how far through the job's length it is. */
function ffmpeg(args: string[], dir: string, seconds: number, onProgress: (pct: number) => void) {
  return new Promise<void>((ok, fail) => {
    const p = spawn(bin("ffmpeg"), args, { cwd: dir });
    let err = "";
    p.stderr.on("data", (d) => { err = (err + d).slice(-2000); });
    p.stdout.on("data", (d) => {
      const m = String(d).match(/out_time_us=(\d+)/g)?.pop();
      if (m) onProgress(Math.min(99, Math.round((+m.split("=")[1] / 1e6 / Math.max(1, seconds)) * 100)));
    });
    p.on("error", fail);
    p.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}: ${err.trim()}`))));
  });
}

/** The uploaded logo of a job, when it has one. */
export async function logoFile(job: { id: string; captionCustom: RenderJob["captionCustom"] }) {
  const l = job.captionCustom?.logo;
  if (!l) return null;
  const f = logoPath(job.id, l.ext);
  return access(f).then(() => f, () => null);
}

export const logoPath = (id: string, ext: string) => join(STORAGE, "logos", `${id}.${ext}`);
