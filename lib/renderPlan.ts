import type { Cue } from "@/db";
import { BLENDS, buildAss, canvasSize, cutsOut, maskAss, punchBlend, resolveStyle, type CaptionCustom } from "@/lib/captionStyles";
import { englishCues } from "@/lib/subtitles";
import { BRAND } from "@/lib/brand";
import { zoomExpr, zoomMoments, zoomOf } from "@/lib/zoom";

/**
 * How a project's captions are made into video, as ffmpeg instructions and the .ass files they read. Nothing here runs
 * anything: the browser (lib/deviceExport.ts, ffmpeg in WebAssembly) and the Adobe panel (its own ffmpeg) carry them out
 * on the user's device. Paths are relative: run them in a folder holding `files` and the caption fonts in `fonts/`.
 * In `args`, VIDEO, LOGO and OUT stand for the files the runner has.
 */
export type RenderJob = { cues: Cue[]; captionStyle: string; captionCustom: CaptionCustom; renderLang: string; watermark?: boolean };
export type Plan = { files: Record<string, string>; args: string[] };
export const VIDEO = "<video>", LOGO = "<logo>", OUT = "<out>";

/** What the export must match in the user's video. `deep`: more than 8 bits (HDR phone clips); `colour`: how it's coloured. */
export type VideoInfo = { size: { width: number; height: number } | null; aac: boolean; deep: boolean; colour: { space: string; primaries: string; trc: string } | null };

/** The frame rate from what `ffmpeg -i` prints, as a fraction where it's an NTSC rate; 30 when it can't tell. */
export function readRate(log: string) {
  const rate = log.match(/Stream #.*Video: .*?([\d.]+) tbr/)?.[1];
  return ({ "23.98": "24000/1001", "29.97": "30000/1001", "59.94": "60000/1001" } as Record<string, string>)[rate ?? ""] ?? (rate && +rate > 0 ? rate : "30");
}

/** Reads VideoInfo from what `ffmpeg -i` prints. Turned phone clips are stored sideways: the size is the upright one. */
export function readVideo(log: string): VideoInfo {
  const line = log.match(/Stream #.*Video: .*/)?.[0] ?? "";
  const dims = line.match(/, (\d{2,5})x(\d{2,5})/);
  const turned = /rotat\w*( of|\s*:)\s*-?(90|270)\b/.test(log);
  const named = line.match(/yuvj?\w*\(([^)]*)\)/)?.[1].split(", ").find((p) => /^(bt|smpte|arib)/.test(p));
  const [space, primaries = space, trc = space] = named?.split("/") ?? [];
  return {
    size: dims ? { width: +dims[turned ? 2 : 1], height: +dims[turned ? 1 : 2] } : null,
    aac: !!dims && /Audio: aac/.test(log),
    deep: /yuv\w*(10|12)(le|be)/.test(line),
    colour: space ? { space, primaries, trc } : null,
  };
}

const langOf = (job: RenderJob) => (["ta", "en", "both"].includes(job.renderLang) ? job.renderLang : "both") as "ta" | "en" | "both";

/** The job's captions as the .ass files its look needs. */
function subs(job: RenderJob, lang: "ta" | "en" | "both", width: number, height: number) {
  // A blended look: the text is a window onto the video blended with the text colour (Negative: inverted). With
  // only the punch blended (Setup & Punch Pro), the rest is drawn as plain text first and the punch is the mask.
  const look = resolveStyle(job.captionStyle, job.captionCustom), blend = look.blend, partial = punchBlend(look);
  const cut = cutsOut(look); // Outline Cut: the bold word drawn apart, the italic word (fattened) taken out of it
  const assOf = (part?: "plain" | "punch" | "cutBase" | "cutBold" | "cutKnock") => buildAss(lang === "en" ? englishCues(job.cues) : job.cues, { styleId: job.captionStyle, custom: job.captionCustom, lang, width, height, part });
  const files: Record<string, string> = { "subs.ass": cut ? assOf("cutBase") : partial ? assOf("plain") : blend ? maskAss(assOf()) : assOf() };
  if (cut) { files["bold.ass"] = maskAss(assOf("cutBold")); files["knock.ass"] = assOf("cutKnock"); }
  if (partial) files["mask.ass"] = maskAss(assOf("punch"));
  return { files, look, blend, partial, cut };
}

/**
 * The finished MP4: captions burned into the video. `size`: the video's, null for an audio-only project (a plain dark
 * canvas). `aac`: its sound is AAC already, so it's copied (no quality lost, less work). `logo`: an uploaded logo is to hand.
 */
export function exportPlan(job: RenderJob, o: VideoInfo & { logo: boolean }): Plan {
  const src = o.size ?? { width: 1920, height: 1080 };
  const canvas = job.captionCustom?.canvas;
  const { width, height } = canvasSize(canvas, src.width, src.height); // the exported frame
  const lang = langOf(job);
  const { files, look, blend, partial, cut } = subs(job, lang, width, height);
  const input = o.size ? ["-i", VIDEO] : ["-f", "lavfi", "-i", `color=c=0x0c0c14:s=${width}x${height}:r=30`, "-i", VIDEO, "-shortest"];
  const audio = o.size ? "0:a?" : "1:a?";
  const graph = [frame(canvas, width, height, !!o.size)];
  let last = "framed";
  // Auto zoom: the frame scaled up around its centre on each caption's key word, cropped back to size (as the preview).
  const zoom = zoomOf(job.captionCustom?.zoom);
  if (zoom) {
    const moments = zoomMoments(job.cues, lang === "en" ? "en" : "ta");
    if (moments.length) {
      const z = zoomExpr(moments, zoom);
      graph.push(`[${last}]scale=w='trunc(iw*(${z})/2)*2':h='trunc(ih*(${z})/2)*2':eval=frame,crop=${width}:${height},setsar=1[zoomed]`);
      last = "zoomed";
    }
  }
  if (o.logo) {
    const l = job.captionCustom.logo!;
    input.push("-i", LOGO);
    const w = Math.max(8, Math.round((width * l.size) / 2) * 2);
    graph.push(`[${o.size ? 1 : 2}:v]scale=${w}:-2,format=rgba,colorchannelmixer=aa=${l.opacity}[logo]`);
    graph.push(`[${last}][logo]overlay=x=${Math.round(l.x * width)}-w/2:y=${Math.round(l.y * height)}-h/2[logoed]`);
    last = "logoed";
  }
  // The ass filter with complex shaping: Tamil and other Indic scripts need it (otherwise vowel signs like ே land
  // after the consonant instead of before it).
  if (cut) {
    graph.push(cutGraph(last, look.cutOut!.bold));
    graph.push(`[cut]ass=subs.ass:fontsdir=fonts:shaping=complex[out]`);
  } else if (partial && blend) {
    graph.push(`[${last}]ass=subs.ass:fontsdir=fonts:shaping=complex[plain]`);
    graph.push(blendGraph("plain", BLENDS[blend][2], look.color, "mask.ass"));
  } else if (blend) graph.push(blendGraph(last, BLENDS[blend][2], look.color));
  else graph.push(`[${last}]ass=subs.ass:fontsdir=fonts:shaping=complex[out]`);
  if (job.watermark) { graph[graph.length - 1] = graph[graph.length - 1].replace(/\[out\]$/, "[subbed]"); graph.push(watermarkGraph("subbed", width, height)); }
  return { files, args: [
    ...input, "-filter_complex", graph.join(";"), "-map", "[out]", "-map", audio,
    // The picture has to be encoded again to carry the captions, so it's encoded to look the same as what came in: the
    // same size and frame rate, a high quality setting, and ten-bit HDR kept as ten-bit HDR (H.265, as phones write it).
    // Not x264's veryfast or slower: they crash its WebAssembly build ("function signature mismatch").
    ...(o.deep ? ["-c:v", "libx265", "-preset", "superfast", "-crf", "18", "-pix_fmt", "yuv420p10le", "-tag:v", "hvc1", "-x265-params", "log-level=error"]
      : ["-c:v", "libx264", "-preset", "superfast", "-crf", "16", "-pix_fmt", "yuv420p"]),
    ...(o.colour ? ["-colorspace", o.colour.space, "-color_primaries", o.colour.primaries, "-color_trc", o.colour.trc] : []),
    ...(o.aac ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "320k"]), "-movflags", "+faststart", OUT,
  ] };
}

/**
 * The same captions with nothing under them, for the Adobe panel: a transparent QuickTime Animation .mov (lossless, and
 * tiny for frames that are mostly empty) at the clip's size and frame rate, to lie above the clip on the timeline. The
 * layers are built premultiplied and straightened at the end, which is what the editors read. Blended looks carry the
 * blended picture of the clip inside the letters. The MP4's reframing and auto zoom change the video, so they aren't here.
 */
export function overlayPlan(job: RenderJob, o: { size: { width: number; height: number } | null; rate: string; logo: boolean; seconds: number }): Plan {
  const { width, height } = o.size ?? { width: 1920, height: 1080 };
  const { rate } = o;
  const { files, look, blend, partial, cut } = subs(job, langOf(job), width, height);
  const canvas = (color: string) => `color=c=${color}:s=${width}x${height}:r=${rate},format=gbrp`;
  const graph: string[] = [];
  const input: string[] = [];
  // What's painted, with its true transparency: the same paint on black and on white. On black it's the colour (already
  // premultiplied); how much of the white still shows is what's see-through. (libass's own alpha option squares the
  // alpha of anything translucent: glows, soft boxes and fades came out too faint.)
  const paint = (filter: string, name: string) => graph.push(
    `${canvas("black")},${filter}[${name}b];${canvas("white")},${filter}[${name}w];[${name}b]split[${name}c][${name}d];` +
    `[${name}w][${name}d]blend=all_mode=subtract,extractplanes=g,negate[${name}a];[${name}c][${name}a]alphamerge,format=rgba[${name}]`);
  const over = (under: string, top: string, out: string) => graph.push(`[${under}][${top}]overlay=alpha=premultiplied:format=rgb:shortest=1[${out}]`);
  const ass = "ass=subs.ass:fontsdir=fonts:shaping=complex";
  let video = "";
  if (blend) {
    input.push(...(o.size ? ["-i", VIDEO] : ["-f", "lavfi", "-i", `color=c=0x0c0c14:s=${width}x${height}:r=${rate}`]));
    graph.push(`[0:v]fps=${rate},setsar=1[clip]`);
    video = "clip";
  }
  let logoLayer = "";
  if (o.logo) {
    const l = job.captionCustom.logo!, at = `x=${Math.round(l.x * width)}-w/2:y=${Math.round(l.y * height)}-h/2`;
    input.push("-i", LOGO);
    graph.push(`[${video ? 1 : 0}:v]scale=${Math.max(8, Math.round((width * l.size) / 2) * 2)}:-2,format=rgba,colorchannelmixer=aa=${l.opacity}${video ? ",split[logo1][logo2]" : "[logo1]"}`);
    graph.push(`color=c=black@0:s=${width}x${height}:r=${rate},format=rgba[empty]`, `[logo1]${PREMULTIPLY}[logop]`, `[empty][logop]overlay=${at}:alpha=premultiplied:format=rgb[logol]`);
    logoLayer = "logol";
    if (video) { graph.push(`[clip][logo2]overlay=${at}[logoed]`); video = "logoed"; }
  }
  let last = "";
  const add = (layer: string) => { if (last) { over(last, layer, `${layer}on`); last = `${layer}on`; } else last = layer; };
  if (logoLayer) add(logoLayer);
  if (cut) {
    graph.push(`${canvas("black")}[cutfrom]`, cutLayer("cutfrom", look.cutOut!.bold));
    add("cutl");
    paint(ass, "plain");
    add("plain");
  } else if (partial && blend) {
    paint(ass, "plain");
    add("plain");
    graph.push(blendLayer(video, BLENDS[blend][2], look.color, "mask.ass"));
    add("blendl");
  } else if (blend) {
    graph.push(blendLayer(video, BLENDS[blend][2], look.color));
    add("blendl");
  } else {
    paint(ass, "plain");
    add("plain");
  }
  if (job.watermark) {
    paint(watermarkText(width, height), "mark");
    add("mark");
  }
  graph.push(`[${last}]format=gbrap,unpremultiply=inplace=1,format=argb[out]`);
  return { files, args: [...input, "-filter_complex", graph.join(";"), "-map", "[out]", "-t", String(o.seconds), "-c:v", "qtrle", OUT] };
}

const PREMULTIPLY = "format=gbrap,premultiply=inplace=1,format=rgba";

/** blendGraph's letters alone, premultiplied. Output [blendl]. */
function blendLayer(from: string, mode: string, color: string, mask = "subs.ass") {
  const c = `0x${color.slice(1, 7)}`;
  return `[${from}]split=3[bv][bc][bm];` +
    `[bc]format=gbrp,drawbox=x=0:y=0:w=iw:h=ih:color=${c}:t=fill[bcol];[bv]format=gbrp[bvid];` +
    `[bvid][bcol]blend=all_mode=${mode}[bl];` +
    `[bm]format=rgb24,drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill,ass=${mask}:fontsdir=fonts:shaping=complex,format=gray[mask];` +
    `[bl][mask]alphamerge,${PREMULTIPLY}[blendl]`;
}

/** cutGraph's word alone, premultiplied. Output [cutl]. */
function cutLayer(from: string, color: string) {
  const c = `0x${color.slice(1, 7)}`, mask = (file: string, out: string) =>
    `[${out}in]format=rgb24,drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill,ass=${file}:fontsdir=fonts:shaping=complex,format=gray[${out}]`;
  return `[${from}]split=3[cc][cbin][ckin];` + mask("bold.ass", "cb") + ";" + mask("knock.ass", "ck") + ";" +
    `[cb][ck]blend=all_mode=subtract[cm];[cc]format=gbrp,drawbox=x=0:y=0:w=iw:h=ih:color=${c}:t=fill[ccol];` +
    `[ccol][cm]alphamerge,${PREMULTIPLY}[cutl]`;
}

/**
 * The text blended into the video: the frame blended (in RGB) with a layer of the text colour, shown only where the
 * captions' mask (subs.ass drawn white on black) is. Output label [out].
 */
export function blendGraph(from: string, mode: string, color: string, mask = "subs.ass") {
  const c = `0x${color.slice(1, 7)}`;
  return `[${from}]split=3[bv][bc][bm];` +
    `[bc]format=gbrp,drawbox=x=0:y=0:w=iw:h=ih:color=${c}:t=fill[bcol];[bv]format=gbrp[bvid];` +
    `[bvid][bcol]blend=all_mode=${mode}[bl];` +
    `[bm]split[bm1][bm2];[bm1]format=rgb24,drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill,ass=${mask}:fontsdir=fonts:shaping=complex,format=gray[mask];` +
    `[bl][mask]alphamerge[blm];[bm2][blm]overlay=format=auto[out]`;
}

/**
 * Outline Cut's knock-out: the bold word as a layer of its colour seen through its mask (bold.ass, white on black) less
 * the italic word fattened by its gap (knock.ass), over the frame, so the video shows through the gap. Output [cut].
 */
export function cutGraph(from: string, color: string) {
  const c = `0x${color.slice(1, 7)}`, mask = (file: string, out: string) =>
    `[${out}in]format=rgb24,drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill,ass=${file}:fontsdir=fonts:shaping=complex,format=gray[${out}]`;
  return `[${from}]split=4[cv][cc][cbin][ckin];` + mask("bold.ass", "cb") + ";" + mask("knock.ass", "ck") + ";" +
    `[cb][ck]blend=all_mode=subtract[cm];[cc]format=gbrp,drawbox=x=0:y=0:w=iw:h=ih:color=${c}:t=fill[ccol];` +
    `[ccol][cm]alphamerge[cl];[cv][cl]overlay=format=auto[cut]`;
}

/** The free plan's mark: "Made with Vasanamm", small and soft in the bottom-right corner, over everything. Output [out]. */
export function watermarkGraph(from: string, width: number, height: number) {
  return `[${from}]${watermarkText(width, height)}[out]`;
}

function watermarkText(width: number, height: number) {
  const size = Math.max(14, Math.round(Math.min(width, height) * 0.028)), m = Math.round(Math.min(width, height) * 0.03);
  return `drawtext=fontfile=fonts/Poppins-Bold.ttf:text='Made with ${BRAND.name}':fontsize=${size}:fontcolor=white@0.75:` +
    `shadowcolor=black@0.5:shadowx=1:shadowy=1:x=w-tw-${m}:y=h-th-${m}`;
}

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
