/**
 * The pictures of the caption styles in the Adobe panel's style list: public/style-previews/<id>.png, made by the render
 * code itself, so each is what that style really gives. Run after adding a style (FFMPEG_DIR if ffmpeg isn't on the path):
 *   npx tsx scripts/style-previews.mts [id ...]
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const dir = await mkdtemp(join(tmpdir(), "vasanam-previews-"));
process.env.STORAGE_DIR = dir;
const { STYLE_CHOICES } = await import("../lib/captionStyles");
const { renderStyled } = await import("../lib/render");
const { bin } = await import("../lib/media");

const run = promisify(execFile), out = resolve("public", "style-previews");
const line = { text: "இந்த song தான் என் favourite", start: 0.3, end: 2.7 }, seconds = 3, at = 2.45;
const clip = join(dir, "clip.mp4");
await mkdir(out, { recursive: true });
await run(bin("ffmpeg"), ["-y", "-v", "error", "-f", "lavfi", "-i", `gradients=s=480x600:c0=0x3b3266:c1=0x14121f:x0=120:y0=90:x1=420:y1=560:d=${seconds}:r=30`, "-c:v", "libx264", "-crf", "10", "-pix_fmt", "yuv420p", clip]);
const wanted = process.argv.slice(2);
for (const s of STYLE_CHOICES.filter((x) => !wanted.length || wanted.includes(x.id))) {
  const job = { id: s.id, filePath: clip, durationSec: seconds, captionStyle: s.id, captionCustom: {}, renderLang: "ta",
    cues: [{ start: line.start, end: line.end, ta: line.text, en: "" }] };
  const video = await renderStyled(job as Parameters<typeof renderStyled>[0], () => {});
  await run(bin("ffmpeg"), ["-y", "-v", "error", "-ss", String(at), "-i", video, "-frames:v", "1", "-update", "1", "-compression_level", "100", join(out, `${s.id}.png`)]);
  console.log(s.id);
}
await rm(dir, { recursive: true, force: true });
