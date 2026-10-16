/**
 * Caption styles: one definition drives both the live preview (components/StyledCaption.tsx)
 * and the burned-in MP4 (ASS subtitles rendered by ffmpeg/libass in the worker).
 * Sizes are fractions of the font size; colours are #RRGGBB or #RRGGBBAA.
 * Fonts live in public/caption-fonts (family names below must match the files).
 */
import type { Cue } from "@/db";
import { breakLines, lineBreaks } from "@/lib/subtitles";

export type Effect = "punch" | "solo" | "vhs" | "typewriter" | "crawl" | "wobble" | "stack";
/** How a caption comes in. */
export const ANIMS = { none: "None", fade: "Fade in", pop: "Pop", slide: "Slide up", bounce: "Bounce", zoom: "Zoom in" } as const;
export type Anim = keyof typeof ANIMS;
/** How the word being said stands out. */
export const HIGHLIGHTS = { style: "The style's own", none: "None", color: "Colour", box: "Box", underline: "Underline", grow: "Grow" } as const;
export type Highlight = keyof typeof HIGHLIGHTS;
export type CaptionStyle = {
  id: string; name: string; group: "Trending" | "Aesthetic" | "Clean" | "Fun"; blurb: string;
  font: string; size?: number; bold?: boolean; italic?: boolean; caps?: boolean; lower?: boolean;
  fontTa?: string;               // font for Tamil letters (the Latin fonts have none); unset = Noto Sans Tamil
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
  stack?: { big: string; font: string }; // "stack": colour and font of the big middle word
  spacing?: number;              // letter spacing, em
  opacity?: number;              // 0-1
  rotate?: number;               // degrees, clockwise
  shadowColor?: string;
  boxPad?: number;               // background padding, em
  anim?: Anim;                   // entrance
  activeGrow?: boolean;          // the word being said grows
};

const GOLD = "#FFC83D", BUTTER = "#FFE58A", CREAM = "#FFF4D6", INK = "#141414", HL = "#FFE14D";

export const CAPTION_STYLES: CaptionStyle[] = [
  { id: "setup-punch", name: "Setup & Punch", group: "Trending", blurb: "A quiet lead-in, then the last words land big, one by one.", font: "Poppins", fontTa: "Hind Madurai", bold: true, color: "#FFFFFF", future: null, shadow: 0.05, effect: "punch" },
  { id: "comic-pop", name: "Comic Pop", group: "Trending", blurb: "Comic caps with a black ring; the keyword turns gold and grows.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.2, caps: true, color: "#FFFFFF", outline: ["#000000", 0.09], keyword: { color: GOLD, grow: true } },
  { id: "butter-serif", name: "Butter Script", group: "Trending", blurb: "Soft script with a hairline edge and a butter-yellow keyword.", font: "Satisfy", fontTa: "Kavivanar", color: "#FFFFFF", outline: ["#000000", 0.03], keyword: { color: BUTTER } },
  { id: "word-box", name: "Word Box", group: "Trending", blurb: "One dark box; words fill in left to right, keyword in gold.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 1.2, caps: true, color: "#FFFFFF", future: null, box: "#0B0B0BE6", keyword: { color: GOLD } },
  { id: "handwritten", name: "Handwritten", group: "Trending", blurb: "Warm script in a single butter tone that brightens as it's said.", font: "Satisfy", fontTa: "Kavivanar", size: 1.3, bold: true, color: BUTTER, future: "#FFE58A66", shadow: 0.04 },
  { id: "retro-vhs", name: "Retro VHS", group: "Trending", blurb: "RGB-split tape look with a little tracking jitter.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 1.1, caps: true, color: "#FFFFFF", effect: "vhs" },
  { id: "trending-1", name: "Trending 1", group: "Trending", blurb: "A few words at a time: one big blue word between small orange lines.", font: "Poppins", fontTa: "Hind Madurai", bold: true, color: "#FF8A1F", shadow: 0.06, effect: "stack", stack: { big: "#2E8BFF", font: "Anton" } },
  { id: "trending-2", name: "Trending 2", group: "Trending", blurb: "A big blue script word with heavy orange words above and below.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", color: "#FF7A00", shadow: 0.06, effect: "stack", stack: { big: "#3D7BFF", font: "Satisfy" } },
  { id: "trending-3", name: "Trending 3", group: "Trending", blurb: "Small white lines around one big red word.", font: "Poppins", fontTa: "Hind Madurai", bold: true, color: "#FFFFFF", shadow: 0.06, effect: "stack", stack: { big: "#FF2D2D", font: "Poppins ExtraBold" } },
  { id: "editorial-cut", name: "Editorial Cut", group: "Aesthetic", blurb: "Warm script, every word set; the spoken one wakes up.", font: "Satisfy", fontTa: "Kavivanar", color: "#FFF1E0", future: "#FFF1E073", active: "#FFD9A0", shadow: 0.04 },
  { id: "soft-display", name: "Soft Display", group: "Aesthetic", blurb: "Lowercase script. Soft, cinematic, premium.", font: "Satisfy", fontTa: "Kavivanar", lower: true, color: "#F6F0E6", shadow: 0.06 },
  { id: "center-stage", name: "Center Stage", group: "Aesthetic", blurb: "One word at a time, tall and heavy, with the last word above.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 1.6, caps: true, color: "#FFFFFF", shadow: 0.05, effect: "solo" },
  { id: "marker-swipe", name: "Marker Swipe", group: "Aesthetic", blurb: "Marker type; the spoken word gets a yellow swipe.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", caps: true, color: "#FFFFFF", active: INK, mark: HL, shadow: 0.04 },
  { id: "spotlight", name: "Spotlight", group: "Aesthetic", blurb: "A warm beam sweeps across the line as it's spoken.", font: "Poppins", fontTa: "Hind Madurai", bold: true, color: "#FFE2B0", future: "#FFFFFF59", shadow: 0.05 },
  { id: "highlighter-paper", name: "Highlighter Paper", group: "Aesthetic", blurb: "Heavy type on cream paper, underlined as you go.", font: "Satisfy", fontTa: "Kavivanar", color: INK, future: "#14141480", underline: true, box: CREAM },
  { id: "highlighter-clean", name: "Highlighter Clean", group: "Aesthetic", blurb: "Same swipe, no paper: white before, ink after.", font: "Poppins", fontTa: "Hind Madurai", bold: true, color: "#FFFFFF", active: INK, mark: HL, shadow: 0.04 },
  { id: "minimal", name: "Minimal", group: "Clean", blurb: "Bold geometric white with a soft shadow. Stays out of the shot.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", color: "#FFFFFF", shadow: 0.06 },
  { id: "editorial-mix", name: "Editorial Mix", group: "Clean", blurb: "Heavy sans; the keyword switches to a script.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", color: "#FFFFFF", shadow: 0.05, keyword: { font: "Satisfy", italic: true } },
  { id: "tall-caps", name: "Tall Caps", group: "Clean", blurb: "Tall condensed caps with a blue bar under the spoken word.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 1.25, caps: true, color: "#FFFFFF", mark: "#2F6BFF", shadow: 0.04 },
  { id: "typewriter", name: "Typewriter", group: "Clean", blurb: "Types itself out, cursor and all.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", color: "#FFFFFF", shadow: 0.05, effect: "typewriter" },
  { id: "eight-bit", name: "8-Bit", group: "Fun", blurb: "Tall arcade caps with a thick outline.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: "#FFFFFF", outline: ["#000000", 0.12], keyword: { color: HL } },
  { id: "doodle-card", name: "Doodle Card", group: "Fun", blurb: "Marker on a paper card; words sit at playful angles.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", color: INK, box: CREAM, effect: "wobble" },
  { id: "doodle-clean", name: "Doodle Clean", group: "Fun", blurb: "Same marker, sticker edge, no card; keyword in marker yellow.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", color: "#FFFFFF", outline: ["#000000", 0.07], keyword: { color: HL }, effect: "wobble" },
  { id: "crawl", name: "Crawl", group: "Fun", blurb: "Opening-crawl lines rolling off into the distance.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 1.1, caps: true, color: HL, effect: "crawl" },
];

export const DEFAULT_STYLE = "minimal";

/** Fonts users can pick (bundled in public/caption-fonts): the Premiere templates' fonts that are free for the web. */
export const CAPTION_FONTS = [
  "Poppins", "Poppins ExtraBold", "Anton", "Roboto Black", "Satisfy",
] as const;

/** Fonts for Tamil letters (bundled in public/caption-fonts; Noto Sans Tamil is also installed on the server). */
export const TAMIL_FONTS = ["Noto Sans Tamil", "Mukta Malar ExtraBold", "Hind Madurai", "Kavivanar", "Pavanam", "Meera Inimai"] as const;

/** A user's edits on top of a style. Every field is optional; null turns a feature off. */
export type CaptionCustom = {
  font?: string; fontTa?: string; size?: number; color?: string; accent?: string;
  outline?: string | null; outlineWidth?: number; box?: string | null; shadow?: boolean;
  case?: "none" | "upper" | "lower"; position?: "top" | "middle" | "bottom"; offset?: number;
  lines?: 1 | 2 | 3;             // lay each caption out on this many lines; unset = wrap by width
  x?: number; y?: number;        // free placement: caption centre as fractions of the frame; overrides position/offset
  safe?: SafeZoneId;             // platform safe zone captions must stay inside
  safeCustom?: Margins;          // margins for safe: "custom"
  bold?: boolean; italic?: boolean;
  spacing?: number; opacity?: number; rotate?: number;
  shadowColor?: string; shadowSize?: number; boxPad?: number;
  anim?: Anim; highlight?: Highlight;
};
export type Margins = { top: number; right: number; bottom: number; left: number }; // fractions of the frame
export type Placement = { position: "top" | "middle" | "bottom"; offset: number; lines?: 1 | 2 | 3; x?: number; y?: number; safe: Margins };

const m = (top: number, right: number, bottom: number, left: number): Margins => ({ top, right, bottom, left });
/** Areas each platform covers with its own buttons and captions on a vertical video (commonly published guides). */
export const SAFE_ZONES = {
  none: { name: "None", m: m(0, 0.07, 0, 0.07) },
  tiktok: { name: "TikTok", m: m(0.1, 0.16, 0.25, 0.04) },
  reels: { name: "Instagram Reels", m: m(0.11, 0.14, 0.22, 0.04) },
  story: { name: "Instagram Story", m: m(0.14, 0.04, 0.2, 0.04) },
  shorts: { name: "YouTube Shorts", m: m(0.1, 0.14, 0.2, 0.04) },
  x: { name: "X / Twitter", m: m(0.05, 0.05, 0.05, 0.05) },
  linkedin: { name: "LinkedIn", m: m(0.05, 0.05, 0.05, 0.05) },
  custom: { name: "Custom", m: m(0.05, 0.05, 0.05, 0.05) },
} as const satisfies Record<string, { name: string; m: Margins }>;
export type SafeZoneId = keyof typeof SAFE_ZONES;

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (n: unknown, lo: number, hi: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined);

/** Keep only well-formed fields (custom styles arrive from the browser). */
export function sanitizeCustom(input: unknown): CaptionCustom {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: CaptionCustom = {};
  if (typeof i.font === "string" && (CAPTION_FONTS as readonly string[]).includes(i.font)) out.font = i.font;
  if (typeof i.fontTa === "string" && (TAMIL_FONTS as readonly string[]).includes(i.fontTa)) out.fontTa = i.fontTa;
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
  if (i.lines === 1 || i.lines === 2 || i.lines === 3) out.lines = i.lines;
  const x = clamp(i.x, 0, 1); if (x !== undefined) out.x = x;
  const y = clamp(i.y, 0, 1); if (y !== undefined) out.y = y;
  if (typeof i.bold === "boolean") out.bold = i.bold;
  if (typeof i.italic === "boolean") out.italic = i.italic;
  const sp = clamp(i.spacing, -0.1, 0.5); if (sp !== undefined) out.spacing = sp;
  const op = clamp(i.opacity, 0.1, 1); if (op !== undefined) out.opacity = op;
  const rot = clamp(i.rotate, -45, 45); if (rot !== undefined) out.rotate = rot;
  if (typeof i.shadowColor === "string" && HEX.test(i.shadowColor)) out.shadowColor = i.shadowColor;
  const ss = clamp(i.shadowSize, 0, 0.4); if (ss !== undefined) out.shadowSize = ss;
  const bp = clamp(i.boxPad, 0.05, 0.8); if (bp !== undefined) out.boxPad = bp;
  if (typeof i.anim === "string" && i.anim in ANIMS) out.anim = i.anim as Anim;
  if (typeof i.highlight === "string" && i.highlight in HIGHLIGHTS) out.highlight = i.highlight as Highlight;
  if (typeof i.safe === "string" && i.safe in SAFE_ZONES) out.safe = i.safe as SafeZoneId;
  const sc = i.safeCustom as Record<string, unknown> | undefined;
  if (sc && typeof sc === "object") out.safeCustom = m(clamp(sc.top, 0, 0.4) ?? 0, clamp(sc.right, 0, 0.4) ?? 0, clamp(sc.bottom, 0, 0.4) ?? 0, clamp(sc.left, 0, 0.4) ?? 0);
  return out;
}

/** A style with the user's edits applied, plus where the caption sits on screen. */
export function resolveStyle(id: string | null | undefined, custom: CaptionCustom = {}, portrait = false): CaptionStyle & Placement {
  const s: CaptionStyle = { ...styleOf(id), keyword: styleOf(id).keyword && { ...styleOf(id).keyword } };
  const c = custom;
  if (c.font) s.font = c.font;
  if (c.fontTa) s.fontTa = c.fontTa;
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
  if (c.bold !== undefined) s.bold = c.bold;
  if (c.italic !== undefined) s.italic = c.italic;
  if (c.spacing !== undefined) s.spacing = c.spacing;
  if (c.opacity !== undefined) s.opacity = c.opacity;
  if (c.rotate !== undefined) s.rotate = c.rotate;
  if (c.shadowColor) s.shadowColor = c.shadowColor;
  if (c.shadowSize !== undefined) s.shadow = c.shadowSize;
  if (c.boxPad !== undefined) s.boxPad = c.boxPad;
  if (c.anim) s.anim = c.anim;
  if (c.highlight && c.highlight !== "style") {
    const acc = c.accent ?? s.mark ?? s.keyword?.color ?? s.active ?? HL;
    s.mark = undefined; s.underline = false; s.activeGrow = false; s.active = undefined;
    if (s.keyword) s.keyword = { ...s.keyword, color: undefined, grow: false };
    if (c.highlight === "color") s.active = acc;
    else if (c.highlight === "box") { s.mark = acc; s.active = INK; }
    else if (c.highlight === "underline") { s.underline = true; s.active = c.accent; }
    else if (c.highlight === "grow") { s.activeGrow = true; s.active = acc; }
  }
  const safe = c.safe === "custom" && c.safeCustom ? c.safeCustom : SAFE_ZONES[c.safe ?? "none"].m;
  const position = c.position ?? "bottom";
  const offset = Math.max(c.offset ?? (portrait ? 0.2 : 0.09), position === "top" ? safe.top : safe.bottom);
  const inside = (v: number | undefined, lo: number, hi: number) => (v === undefined ? undefined : Math.min(hi, Math.max(lo, v)));
  return { ...s, position, offset, lines: c.lines, x: inside(c.x, safe.left, 1 - safe.right), y: inside(c.y, safe.top, 1 - safe.bottom), safe };
}
/** The project's customisation with one caption's own on top (a caption given a position drops the project's drag point). */
export function mergeCustom(project: CaptionCustom = {}, own?: CaptionCustom): CaptionCustom {
  if (!own) return project;
  const out = { ...project, ...own };
  if (own.position && own.x === undefined) { delete out.x; delete out.y; }
  return out;
}

export const styleOf = (id: string | null | undefined) => CAPTION_STYLES.find((s) => s.id === id) ?? CAPTION_STYLES.find((s) => s.id === DEFAULT_STYLE)!;

/** Words of a line with their timings: the measured starts when there's one per word, else shared by length. */
export function wordTimes(text: string, start: number, end: number, starts?: number[]) {
  const words = text.split(/\s+/).filter(Boolean);
  if (starts && starts.length === words.length && words.length) {
    return words.map((w, i) => ({ w, s: Math.max(start, starts[i]), e: i + 1 < words.length ? Math.max(start, starts[i + 1]) : end }));
  }
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

/** Split n items into k runs of near-equal size. */
function runs<T>(list: T[], k: number) {
  const out: T[][] = [];
  for (let i = 0, from = 0; i < k; i++) { const to = Math.round((list.length * (i + 1)) / k); out.push(list.slice(from, to)); from = to; }
  return out;
}

/**
 * "stack" styles (and the panel's Trending templates, plugin/subs.js partsChunks): a caption cut into pieces of up
 * to 3 words (2 when English takes the bottom line), each shown as small line / big word / small line, timed by
 * length and at least `minDur` seconds long.
 */
export function stackChunks(main: string, sub: string, start: number, end: number, minDur = 1) {
  const words = main.split(/\s+/).filter(Boolean), en = sub.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const k = Math.max(1, Math.min(Math.ceil(words.length / (en.length ? 2 : 3)), Math.floor((end - start) / minDur)));
  const groups = runs(words, k), ens = runs(en, k);
  const total = groups.reduce((n, g) => n + g.join(" ").length + 1, 0);
  let t = start;
  return groups.map((g, i) => {
    const s = t, mid = g.length === 2 ? 1 : Math.floor((g.length - 1) / 2);
    t += ((end - start) * (g.join(" ").length + 1)) / total;
    const parts: [string, string, string] = en.length ? [g.slice(0, -1).join(" "), g[g.length - 1], ens[i].join(" ")]
      : [g.slice(0, mid).join(" "), g[mid], g.slice(mid + 1).join(" ")];
    return { s, e: i === groups.length - 1 ? end : t, parts };
  });
}

/** Scale of a "stack" style's big word: 1.35× the font, less for a word longer than 10 letters. */
export const stackBig = (word: string) => Math.round(135 * Math.min(1, 10 / Math.max(1, [...word].length))) / 100;

/** #RRGGBB[AA] with its opacity multiplied by o. */
export function withOpacity(hex: string, o: number) {
  if (o >= 1) return hex;
  const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  return hex.slice(0, 7) + Math.round(a * o * 255).toString(16).padStart(2, "0");
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
const esc = (t: string) => t.replace(/[{}]/g, (c) => (c === "{" ? "(" : ")")).replace(/\\/g, "/").replace(/\n/g, "\\N");

const TAMIL_FONT = "Noto Sans Tamil"; // installed on the server (fonts-noto-core)

/**
 * Put Tamil runs of an ASS event in the Tamil font, then back to the font in effect. Left to libass's own fallback,
 * a style font without Tamil letters picks a font per run, and a word on its own can lose its conjuncts (ப்ப drawn
 * as ப + a dotted circle).
 */
export function tamilRuns(text: string, fonts: Record<string, string>, style: string, tamil = TAMIL_FONT, spacing = 0) {
  let font = fonts[style], out = "", inTamil = false;
  for (let i = 0; i < text.length; ) {
    if (text[i] === "{") { // override block: follow \fn and \r[Style]
      const end = text.indexOf("}", i), block = text.slice(i, end + 1);
      for (const m of block.matchAll(/\\(fn|r)([^\\}]*)/g)) font = m[1] === "fn" ? m[2] || fonts[style] : fonts[m[2]] ?? fonts[style];
      out += block; i = end + 1;
      if (inTamil) out += `{\\fn${tamil}${spacing ? "\\fsp0" : ""}}`; // a block inside a Tamil run may have reset the font
      continue;
    }
    const ta = /[\u0B80-\u0BFF\u200C\u200D]/.test(text[i]);
    // Letter spacing pulls Tamil letters apart in libass (ப்ப drawn as ப ் ப): none inside Tamil.
    if (ta !== inTamil && (ta || !/\s/.test(text[i]))) { out += `{\\fn${ta ? tamil : font}${spacing ? `\\fsp${ta ? 0 : spacing}` : ""}}`; inTamil = ta; }
    out += text[i++];
  }
  return out;
}

type Opts = { styleId: string; custom?: CaptionCustom; lang: "ta" | "en" | "both"; width: number; height: number };

/** A full .ass file for the cues in the chosen style, sized to the video. */
export function buildAss(cues: Cue[], o: Opts) {
  const short = Math.min(o.width, o.height);
  // Everything a look needs, for the project's style ("Main") and for each caption that has its own ("C<n>").
  const lookOf = (custom: CaptionCustom | undefined, name: string) => {
    const s = resolveStyle(o.styleId, custom, o.height > o.width);
    const fs = Math.round(short * 0.075 * (s.size ?? 1));
    const px = (f = 0) => Math.round(f * fs * 10) / 10;
    const marginV = Math.round(o.height * s.offset);
    const align = s.position === "top" ? 8 : s.position === "middle" ? 5 : 2;
    // Dragged placement: centre every line on the point (dx nudges the VHS colour copies apart).
    const posAt = (dx: number) => (s.x !== undefined && s.y !== undefined ? `{\\an5\\pos(${Math.round(s.x * o.width + dx)},${Math.round(s.y * o.height)})}` : "");
    // Lines wrap inside the safe zone's side margins.
    const marginL = Math.round(o.width * s.safe.left), marginR = Math.round(o.width * s.safe.right);
    const marginH = Math.max(marginL, marginR);
    const wrapM = s.x !== undefined ? Math.max(marginH, Math.round(o.width * (0.5 - Math.min(s.x - s.safe.left, 1 - s.safe.right - s.x)))) : 0;
    const box = !!s.box;
    const fade = (hex: string) => withOpacity(hex, s.opacity ?? 1);
    const shadowColor = s.shadowColor ? s.shadowColor + "99" : "#00000099";
    const line = [
      name, s.font, fs, assColor(fade(s.color)), assColor(fade(s.color)),
      assColor(fade(box ? s.box! : s.outline?.[0] ?? "#000000")), assColor(fade(box ? s.box! : shadowColor)),
      s.bold ? -1 : 0, s.italic ? -1 : 0, 0, 0, 100, 100, px(s.spacing), -(s.rotate ?? 0),
      box ? 3 : 1, box ? px(s.boxPad ?? 0.28) : px(s.outline?.[1]), box ? 0 : px(s.shadow), align, marginL, marginR, marginV, 1,
    ].join(",");
    // Where an aligned (not dragged) caption is anchored, for animations that move it.
    const ax = s.x !== undefined ? s.x * o.width : (marginL + o.width - marginR) / 2;
    const ay = s.y !== undefined ? s.y * o.height : align === 8 ? marginV : align === 5 ? o.height / 2 : o.height - marginV;
    /**
     * Entrance for a caption's first event (its later word-by-word events show it settled): tags for the whole event
     * (fade, move) and tags for each word's block (scaling; every word block starts with a reset).
     */
    const entrance = (dur: number): [string, string] => {
      const a = s.anim, t = Math.round(Math.min(250, dur * 400));
      if (!a || a === "none") return ["", ""];
      if (a === "fade") return [`{\\fad(${t},0)}`, ""];
      if (a === "pop") return ["", `\\fscx60\\fscy60\\t(0,${t},\\fscx100\\fscy100)`];
      if (a === "zoom") return ["", `\\fscx0\\fscy0\\t(0,${t},\\fscx100\\fscy100)`];
      if (a === "bounce") return ["", `\\fscx40\\fscy40\\t(0,${Math.round(t * 0.6)},\\fscx118\\fscy118)\\t(${Math.round(t * 0.6)},${t},\\fscx100\\fscy100)`];
      const d = Math.round(fs * 0.6), an = s.x !== undefined ? 5 : align; // slide up
      return [`{\\an${an}\\move(${Math.round(ax)},${Math.round(ay + d)},${Math.round(ax)},${Math.round(ay)},0,${t})\\fad(${Math.round(t * 0.6)},0)}`, ""];
    };
    return { name, s, px, align, posAt, pos: posAt(0), marginL, marginR, wrapM, line, entrance };
  };
  const base = lookOf(o.custom, "Main");
  const looks = [base];
  const lookFor = (c: Cue) => {
    if (!c.style || !Object.keys(c.style).length) return base;
    const l = lookOf(mergeCustom(o.custom, c.style), `C${looks.length}`);
    looks.push(l);
    return l;
  };
  const second = ["Second", "Poppins", Math.round(short * 0.075 * 0.55), "&H00FFFFFF&", "&H00FFFFFF&", "&H00000000&", "&H99000000&", 0, 0, 0, 0, 100, 100, 0, 0, 1, base.px(0.04), base.px(0.04), base.align, base.marginL, base.marginR, Math.round(o.height * base.s.offset), 1].join(",");

  const events: string[] = [];
  const fonts: Record<string, string> = { Second: "Poppins" }, tamil: Record<string, string> = {}, spaced: Record<string, number> = {};
  let cur = "Main";
  const add = (start: number, end: number, text: string, layer = 0, ml = 0, mr = 0, st = cur) =>
    end > start && events.push(`Dialogue: ${layer},${assTime(start)},${assTime(end)},${st},,${ml},${mr},0,,${tamilRuns(text, fonts, st, tamil[st], spaced[st])}`);

  for (const c of cues) {
    const main = (o.lang === "en" ? c.en : c.ta).trim();
    if (!main) continue;
    const look = lookFor(c);
    const { s, px, pos, posAt, wrapM, marginL, marginR, entrance } = look;
    cur = look.name;
    fonts[cur] = s.font;
    if (s.fontTa) tamil[cur] = s.fontTa;
    if (s.spacing) spaced[cur] = px(s.spacing);
    const colors = o.lang === "en" ? c.wce : c.wc; // the user's colour for single words
    const sub = o.lang === "both" ? c.en.trim() : "";
    // English in the caption's font, turned and spaced like it.
    const tail = sub ? `\\N{\\rSecond\\fn${s.font}${s.rotate ? `\\frz${-s.rotate}` : ""}${s.spacing ? `\\fsp${px(s.spacing * 0.55)}` : ""}}${esc(breakLines(sub, s.lines))}` : "";
    const words = wordTimes(caseOf(s, main), c.start, c.end, o.lang === "en" ? c.we : c.w);
    const kw = keywordIndex(words.map((w) => w.w));
    const brk = lineBreaks(words.map((w) => w.w), s.lines);
    const glue = (j: number) => (j ? (brk.has(j - 1) ? "\\N" : " ") : "");
    const q = s.lines === 1 ? "{\\q2}" : ""; // one line: no auto-wrap

    // One word, in a given state, with its override tags.
    const word = (j: number, i: number, extra = "") => {
      const w = esc(words[j].w);
      const state = j < i ? "past" : j === i ? "active" : "future";
      let t = "\\r" + extra;
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
      if (s.activeGrow && state === "active") t += "\\t(0,120,\\fscx115\\fscy115)";
      if (colors?.[j] && state !== "future") t += `\\1c${colorOnly(colors[j]!)}`;
      return `{${t}}${w}`;
    };

    if (s.effect === "stack" && s.stack) {
      const small = "\\fscx60\\fscy60";
      for (const p of stackChunks(caseOf(s, main), sub, c.start, c.end)) {
        const [a, b, d] = p.parts.map(esc);
        const z = stackBig(p.parts[1]); // a long word gets smaller instead of running off the frame
        const big = `{\\r\\fn${s.stack.font}\\b0\\1c${colorOnly(s.stack.big)}\\fscx${Math.round(z * 40)}\\fscy${Math.round(z * 40)}\\t(0,220,\\fscx${Math.round(z * 100)}\\fscy${Math.round(z * 100)})}${b}`;
        add(p.s, p.e, pos + `{\\q2\\fad(120,0)}` + (a ? `{${small}}${a}\\N` : "") + big + (d ? `\\N{\\r${small}}${d}` : ""), 0, wrapM, wrapM);
      }
      continue;
    }
    if (s.effect === "crawl") {
      const H = o.height, cx = Math.round(o.width / 2);
      add(c.start, c.end, `{\\an8\\fad(200,300)\\org(${cx},${H})\\frx55\\move(${cx},${Math.round(H * 0.66)},${cx},${Math.round(H * 0.42)})}${esc(breakLines(caseOf(s, main), s.lines))}${tail}`);
      continue;
    }
    if (s.effect === "vhs") {
      const text = esc(breakLines(caseOf(s, main), s.lines)) + tail;
      const nudge = [0, 2, -1, 1, -2];
      for (let t = c.start, k = 0; t < c.end; t += 0.25, k++) {
        const e = Math.min(c.end, t + 0.25), d = Math.round(px(0.05) + nudge[k % nudge.length]);
        add(t, e, posAt(d + 2) + `{\\1c&H3C3CFF&\\1a&H60&\\bord0\\shad0}${text}`, 0, marginL + 2 * d + 4, marginR); // red, nudged right
        add(t, e, posAt(-d - 2) + `{\\1c&HFFE600&\\1a&H60&\\bord0\\shad0}${text}`, 1, marginL, marginR + 2 * d + 4); // cyan, nudged left
        add(t, e, pos + `{\\bord0\\shad0}${text}`, 2);
      }
      continue;
    }
    if (s.effect === "typewriter") {
      const chars = [...breakLines(caseOf(s, main), s.lines)];
      const step = (c.end - c.start) * 0.8 / chars.length;
      for (let n = 1; n <= chars.length; n++) {
        const t0 = c.start + (n - 1) * step;
        const t1 = n === chars.length ? c.end : t0 + step;
        add(t0, t1, pos + `${esc(chars.slice(0, n).join(""))}{\\alpha&H00&}_${tail}`, 0, wrapM, wrapM);
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
        // The first event brings the caption in (a slide places it itself).
        const [ev, each] = i === 0 ? entrance(c.end - c.start) : ["", ""];
        text = words.map((_, j) => glue(j) + word(j, i, each)).join("");
        const sub = each && tail ? tail.replace("}", each + "}") : tail;
        add(wt.s, end, (ev.includes("\\move") ? "" : pos) + ev + q + text + sub, 0, wrapM, wrapM);
        return;
      }
      add(wt.s, end, pos + q + text + tail, 0, wrapM, wrapM);
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
${looks.map((l) => `Style: ${l.line}`).join("\n")}
Style: ${second}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}
