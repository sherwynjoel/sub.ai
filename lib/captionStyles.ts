/**
 * Caption styles: one definition drives both the live preview (components/StyledCaption.tsx)
 * and the burned-in MP4 (ASS subtitles rendered by ffmpeg/libass in the worker).
 * Sizes are fractions of the font size; colours are #RRGGBB or #RRGGBBAA.
 * Fonts live in public/caption-fonts (family names below must match the files).
 */
import type { Cue } from "@/db";

export type Effect = "punch" | "solo" | "vhs" | "typewriter" | "crawl" | "wobble";
export type CaptionStyle = {
  id: string; name: string; group: "Trending" | "Aesthetic" | "Clean" | "Fun"; blurb: string;
  font: string; size?: number; bold?: boolean; italic?: boolean; caps?: boolean; lower?: boolean;
  color: string;                 // spoken and already-spoken words
  future?: string | null;        // words not yet spoken; null = hidden until spoken; omitted = same as color
  active?: string;               // the word being spoken
  mark?: string;                 // highlighter swipe behind the word being spoken
  underline?: boolean;           // underline the word being spoken
  keyword?: { color?: string; grow?: boolean; font?: string; italic?: boolean };
  outline?: [string, number];    // colour, width
  shadow?: number;
  box?: string;                  // solid card behind the line
  effect?: Effect;
};

const GOLD = "#FFC83D", BUTTER = "#FFE58A", CREAM = "#FFF4D6", INK = "#141414", HL = "#FFE14D";

export const CAPTION_STYLES: CaptionStyle[] = [
  { id: "setup-punch", name: "Setup & Punch", group: "Trending", blurb: "A quiet lead-in, then the last words land big, one by one.", font: "Instrument Sans", bold: true, color: "#FFFFFF", future: null, shadow: 0.05, effect: "punch" },
  { id: "comic-pop", name: "Comic Pop", group: "Trending", blurb: "Comic caps with a black ring; the keyword turns gold and grows.", font: "Bangers", size: 1.2, caps: true, color: "#FFFFFF", outline: ["#000000", 0.09], keyword: { color: GOLD, grow: true } },
  { id: "butter-serif", name: "Butter Serif", group: "Trending", blurb: "Soft serif with a hairline edge and a butter-yellow keyword.", font: "DM Serif Display", color: "#FFFFFF", outline: ["#000000", 0.03], keyword: { color: BUTTER } },
  { id: "word-box", name: "Word Box", group: "Trending", blurb: "One dark box; words fill in left to right, keyword in gold.", font: "Bebas Neue", size: 1.2, caps: true, color: "#FFFFFF", future: null, box: "#0B0B0BE6", keyword: { color: GOLD } },
  { id: "handwritten", name: "Handwritten", group: "Trending", blurb: "Warm handwriting in a single butter tone that brightens as it's said.", font: "Caveat", size: 1.3, bold: true, color: BUTTER, future: "#FFE58A66", shadow: 0.04 },
  { id: "retro-vhs", name: "Retro VHS", group: "Trending", blurb: "RGB-split tape look with a little tracking jitter.", font: "Anton", size: 1.1, caps: true, color: "#FFFFFF", effect: "vhs" },
  { id: "editorial-cut", name: "Editorial Cut", group: "Aesthetic", blurb: "Warm serif, every word set; the spoken one wakes up.", font: "Fraunces", color: "#FFF1E0", future: "#FFF1E073", active: "#FFD9A0", shadow: 0.04 },
  { id: "soft-display", name: "Soft Display", group: "Aesthetic", blurb: "Lowercase display serif. Soft, cinematic, premium.", font: "Fraunces", lower: true, color: "#F6F0E6", shadow: 0.06 },
  { id: "center-stage", name: "Center Stage", group: "Aesthetic", blurb: "One word at a time, tall and heavy, with the last word above.", font: "Anton", size: 1.6, caps: true, color: "#FFFFFF", shadow: 0.05, effect: "solo" },
  { id: "marker-swipe", name: "Marker Swipe", group: "Aesthetic", blurb: "Marker type; the spoken word gets a yellow swipe.", font: "Permanent Marker", caps: true, color: "#FFFFFF", active: INK, mark: HL, shadow: 0.04 },
  { id: "spotlight", name: "Spotlight", group: "Aesthetic", blurb: "A warm beam sweeps across the line as it's spoken.", font: "Instrument Sans", bold: true, color: "#FFE2B0", future: "#FFFFFF59", shadow: 0.05 },
  { id: "highlighter-paper", name: "Highlighter Paper", group: "Aesthetic", blurb: "Serif on cream paper, underlined as you go.", font: "DM Serif Display", color: INK, future: "#14141480", underline: true, box: CREAM },
  { id: "highlighter-clean", name: "Highlighter Clean", group: "Aesthetic", blurb: "Same swipe, no paper: white before, ink after.", font: "Instrument Sans", bold: true, color: "#FFFFFF", active: INK, mark: HL, shadow: 0.04 },
  { id: "minimal", name: "Minimal", group: "Clean", blurb: "Bold geometric white with a soft shadow. Stays out of the shot.", font: "Archivo Black", color: "#FFFFFF", shadow: 0.06 },
  { id: "editorial-mix", name: "Editorial Mix", group: "Clean", blurb: "Heavy grotesk; the keyword switches to an italic serif.", font: "Archivo Black", color: "#FFFFFF", shadow: 0.05, keyword: { font: "DM Serif Display", italic: true } },
  { id: "tall-caps", name: "Tall Caps", group: "Clean", blurb: "Tall condensed caps with a blue bar under the spoken word.", font: "Bebas Neue", size: 1.25, caps: true, color: "#FFFFFF", mark: "#2F6BFF", shadow: 0.04 },
  { id: "typewriter", name: "Typewriter", group: "Clean", blurb: "Types itself out, cursor and all.", font: "Special Elite", color: "#FFFFFF", shadow: 0.05, effect: "typewriter" },
  { id: "eight-bit", name: "8-Bit", group: "Fun", blurb: "Pixel type for that arcade energy.", font: "Press Start 2P", size: 0.62, color: "#FFFFFF", outline: ["#000000", 0.12], keyword: { color: HL } },
  { id: "doodle-card", name: "Doodle Card", group: "Fun", blurb: "Marker on a paper card; words sit at playful angles.", font: "Permanent Marker", color: INK, box: CREAM, effect: "wobble" },
  { id: "doodle-clean", name: "Doodle Clean", group: "Fun", blurb: "Same marker, sticker edge, no card; keyword in marker yellow.", font: "Permanent Marker", color: "#FFFFFF", outline: ["#000000", 0.07], keyword: { color: HL }, effect: "wobble" },
  { id: "crawl", name: "Crawl", group: "Fun", blurb: "Opening-crawl lines rolling off into the distance.", font: "Bebas Neue", size: 1.1, caps: true, color: HL, effect: "crawl" },
];

export const DEFAULT_STYLE = "minimal";

/** Fonts users can pick when customising (all bundled in public/caption-fonts). */
export const CAPTION_FONTS = [
  "Instrument Sans", "Archivo Black", "Bebas Neue", "Anton", "Bangers", "DM Serif Display",
  "Fraunces", "Caveat", "Permanent Marker", "Special Elite", "Press Start 2P",
] as const;

/** A user's edits on top of a style. Every field is optional; null turns a feature off. */
export type CaptionCustom = {
  font?: string; size?: number; color?: string; accent?: string;
  outline?: string | null; outlineWidth?: number; box?: string | null; shadow?: boolean;
  case?: "none" | "upper" | "lower"; position?: "top" | "middle" | "bottom"; offset?: number;
};
export type Placement = { position: "top" | "middle" | "bottom"; offset: number };

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (n: unknown, lo: number, hi: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined);

/** Keep only well-formed fields (custom styles arrive from the browser). */
export function sanitizeCustom(input: unknown): CaptionCustom {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: CaptionCustom = {};
  if (typeof i.font === "string" && (CAPTION_FONTS as readonly string[]).includes(i.font)) out.font = i.font;
  const size = clamp(i.size, 0.4, 2.6); if (size !== undefined) out.size = size;
  if (typeof i.color === "string" && HEX.test(i.color)) out.color = i.color;
  if (typeof i.accent === "string" && HEX.test(i.accent)) out.accent = i.accent;
  if (i.outline === null || (typeof i.outline === "string" && HEX.test(i.outline))) out.outline = i.outline as string | null;
  const ow = clamp(i.outlineWidth, 0.01, 0.2); if (ow !== undefined) out.outlineWidth = ow;
  if (i.box === null || (typeof i.box === "string" && HEX.test(i.box))) out.box = i.box as string | null;
  if (typeof i.shadow === "boolean") out.shadow = i.shadow;
  if (i.case === "none" || i.case === "upper" || i.case === "lower") out.case = i.case;
  if (i.position === "top" || i.position === "middle" || i.position === "bottom") out.position = i.position;
  const off = clamp(i.offset, 0.02, 0.45); if (off !== undefined) out.offset = off;
  return out;
}

/** A style with the user's edits applied, plus where the caption sits on screen. */
export function resolveStyle(id: string | null | undefined, custom: CaptionCustom = {}, portrait = false): CaptionStyle & Placement {
  const s: CaptionStyle = { ...styleOf(id), keyword: styleOf(id).keyword && { ...styleOf(id).keyword } };
  const c = custom;
  if (c.font) s.font = c.font;
  if (c.size !== undefined) s.size = c.size;
  if (c.color) {
    s.color = c.color;
    if (typeof s.future === "string") s.future = c.color + "66"; // dimmed version of the new colour
  }
  if (c.accent) {
    if (s.mark) s.mark = c.accent;
    else if (s.keyword) s.keyword.color = c.accent;
    else if (s.active) s.active = c.accent;
    else s.keyword = { color: c.accent };
  }
  if (c.outline === null) s.outline = undefined;
  else if (c.outline || c.outlineWidth !== undefined) s.outline = [c.outline ?? s.outline?.[0] ?? "#000000", c.outlineWidth ?? s.outline?.[1] ?? 0.06];
  if (c.box === null) s.box = undefined;
  else if (c.box) s.box = c.box;
  if (c.shadow === false) s.shadow = 0;
  else if (c.shadow === true && !s.shadow) s.shadow = 0.05;
  if (c.case) { s.caps = c.case === "upper"; s.lower = c.case === "lower"; }
  return { ...s, position: c.position ?? "bottom", offset: c.offset ?? (portrait ? 0.2 : 0.09) };
}
export const styleOf = (id: string | null | undefined) => CAPTION_STYLES.find((s) => s.id === id) ?? CAPTION_STYLES.find((s) => s.id === DEFAULT_STYLE)!;

/** Words of a line with estimated timings (speech has no word timestamps, so time is shared by length). */
export function wordTimes(text: string, start: number, end: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const total = words.reduce((n, w) => n + w.length, 0) || 1;
  let t = start;
  return words.map((w) => {
    const s = t;
    t += ((end - start) * w.length) / total;
    return { w, s, e: t };
  });
}

/** The keyword a style can pick out: the longest word, the later one on a tie. */
export function keywordIndex(words: string[]) {
  let k = 0;
  words.forEach((w, i) => { if (w.length >= words[k].length) k = i; });
  return k;
}

export const caseOf = (s: CaptionStyle, text: string) => (s.caps ? text.toUpperCase() : s.lower ? text.toLowerCase() : text);

/* ---------- ASS (burned-in MP4) ---------- */

/** #RRGGBB[AA] → ASS &HAABBGGRR (ASS alpha is inverted: 00 = opaque). */
export function assColor(hex: string) {
  const h = hex.replace("#", "");
  const a = h.length === 8 ? 255 - parseInt(h.slice(6, 8), 16) : 0;
  const hx = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `&H${hx(a)}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}&`.toUpperCase();
}
const alphaOf = (hex: string) => assColor(hex).slice(2, 4);
const colorOnly = (hex: string) => `&H${assColor(hex).slice(4)}`;
const assTime = (t: number) => {
  const cs = Math.max(0, Math.round(t * 100));
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
const esc = (t: string) => t.replace(/[{}]/g, (c) => (c === "{" ? "(" : ")")).replace(/\\/g, "/").replace(/\n/g, " ");

type Opts = { styleId: string; custom?: CaptionCustom; lang: "ta" | "en" | "both"; width: number; height: number };

/** A full .ass file for the cues in the chosen style, sized to the video. */
export function buildAss(cues: Cue[], o: Opts) {
  const s = resolveStyle(o.styleId, o.custom, o.height > o.width);
  const short = Math.min(o.width, o.height);
  const fs = Math.round(short * 0.075 * (s.size ?? 1));
  const px = (f = 0) => Math.round(f * fs * 10) / 10;
  const marginV = Math.round(o.height * s.offset);
  const align = s.position === "top" ? 8 : s.position === "middle" ? 5 : 2;
  const marginH = Math.round(o.width * 0.07);
  const box = !!s.box;
  const style = [
    "Main", s.font, fs, assColor(s.color), assColor(s.color),
    assColor(box ? s.box! : s.outline?.[0] ?? "#000000"), assColor(box ? s.box! : "#00000099"),
    s.bold ? -1 : 0, s.italic ? -1 : 0, 0, 0, 100, 100, 0, 0,
    box ? 3 : 1, box ? px(0.28) : px(s.outline?.[1]), box ? 0 : px(s.shadow), align, marginH, marginH, marginV, 1,
  ].join(",");
  const second = ["Second", "Instrument Sans", Math.round(short * 0.075 * 0.55), "&H00FFFFFF&", "&H00FFFFFF&", "&H00000000&", "&H99000000&", 0, 0, 0, 0, 100, 100, 0, 0, 1, px(0.04), px(0.04), align, marginH, marginH, marginV, 1].join(",");

  const events: string[] = [];
  const add = (start: number, end: number, text: string, layer = 0, ml = 0, mr = 0, st = "Main") =>
    end > start && events.push(`Dialogue: ${layer},${assTime(start)},${assTime(end)},${st},,${ml},${mr},0,,${text}`);

  for (const c of cues) {
    const main = (o.lang === "en" ? c.en : c.ta).trim();
    if (!main) continue;
    const sub = o.lang === "both" ? c.en.trim() : "";
    const tail = sub ? `\\N{\\rSecond}${esc(sub)}` : "";
    const words = wordTimes(caseOf(s, main), c.start, c.end);
    const kw = keywordIndex(words.map((w) => w.w));

    // One word, in a given state, with its override tags.
    const word = (j: number, i: number) => {
      const w = esc(words[j].w);
      const state = j < i ? "past" : j === i ? "active" : "future";
      let t = "\\r";
      if (state === "future") {
        if (s.future === null) t += "\\alpha&HFF&";
        else if (s.future) t += `\\1c${colorOnly(s.future)}\\1a&H${alphaOf(s.future)}&`;
      }
      if (state === "active") {
        if (s.active) t += `\\1c${colorOnly(s.active)}`;
        if (s.mark) t += `\\bord${px(0.16)}\\3c${colorOnly(s.mark)}\\shad0`;
        if (s.underline) t += "\\u1";
      }
      if (j === kw && s.keyword && state !== "future") {
        if (s.keyword.color) t += `\\1c${colorOnly(s.keyword.color)}`;
        if (s.keyword.font) t += `\\fn${s.keyword.font}`;
        if (s.keyword.italic) t += "\\i1";
        if (s.keyword.grow) t += state === "active" ? "\\t(0,180,\\fscx118\\fscy118)" : "\\fscx118\\fscy118";
      }
      if (s.effect === "wobble") t += `\\frz${j % 2 ? -4 : 3}`;
      return `{${t}}${w}`;
    };

    if (s.effect === "crawl") {
      const H = o.height, cx = Math.round(o.width / 2);
      add(c.start, c.end, `{\\an8\\fad(200,300)\\org(${cx},${H})\\frx55\\move(${cx},${Math.round(H * 0.66)},${cx},${Math.round(H * 0.42)})}${esc(caseOf(s, main))}${tail}`);
      continue;
    }
    if (s.effect === "vhs") {
      const text = esc(caseOf(s, main)) + tail;
      const nudge = [0, 2, -1, 1, -2];
      for (let t = c.start, k = 0; t < c.end; t += 0.25, k++) {
        const e = Math.min(c.end, t + 0.25), d = Math.round(px(0.05) + nudge[k % nudge.length]);
        add(t, e, `{\\1c&H3C3CFF&\\1a&H60&\\bord0\\shad0}${text}`, 0, marginH + 2 * d + 4, marginH); // red, nudged right
        add(t, e, `{\\1c&HFFE600&\\1a&H60&\\bord0\\shad0}${text}`, 1, marginH, marginH + 2 * d + 4); // cyan, nudged left
        add(t, e, `{\\bord0\\shad0}${text}`, 2);
      }
      continue;
    }
    if (s.effect === "typewriter") {
      const chars = [...caseOf(s, main)];
      const step = (c.end - c.start) * 0.8 / chars.length;
      for (let n = 1; n <= chars.length; n++) {
        const t0 = c.start + (n - 1) * step;
        const t1 = n === chars.length ? c.end : t0 + step;
        add(t0, t1, `${esc(chars.slice(0, n).join(""))}{\\alpha&H00&}_${tail}`);
      }
      continue;
    }
    words.forEach((wt, i) => {
      const end = i === words.length - 1 ? c.end : words[i + 1].s;
      let text: string;
      if (s.effect === "solo") {
        text = (i > 0 ? `{\\fscx45\\fscy45\\1a&H60&}${esc(words[i - 1].w)}\\N` : "") + `{\\r\\t(0,120,\\fscx108\\fscy108)}${esc(wt.w)}`;
      } else if (s.effect === "punch" && words.length > 2) {
        const cut = words.length - Math.min(2, words.length - 1);
        const setup = words.slice(0, cut).map((_, j) => word(j, i)).join(" ");
        const punch = words.slice(cut).map((_, k) => word(cut + k, i)).join(" ");
        text = `{\\fscx55\\fscy55}${setup.replace(/\{\\r/g, "{\\r\\fscx55\\fscy55")}\\N{\\r\\fscx140\\fscy140}${punch.replace(/\{\\r/g, "{\\r\\fscx140\\fscy140")}`;
      } else {
        text = words.map((_, j) => word(j, i)).join(" ");
      }
      add(wt.s, end, text + tail);
    });
  }

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${o.width}
PlayResY: ${o.height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ${style}
Style: ${second}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}
