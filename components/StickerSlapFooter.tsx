"use client"

import * as React from "react"

/**
 * Sticker Slap Footer (from 21st.dev): a cream frame, a coloured panel with three columns, and a giant script
 * wordmark sinking into the bottom edge with die-cut stickers slapped over it. As the footer scrolls in the
 * panel grows, the columns pop in, the wordmark writes itself in one marker stroke and each sticker slaps down
 * as the pen passes. Then it's a toy: drag the stickers (double-click sends one home), click the wordmark to
 * write it again, copy the email. React is the only import; the script and every sticker are drawn in code.
 * Used as the landing page footer (components/Landing.tsx).
 */

// #region slap
// Pure: the script alphabet, layout, stars and sticker spots.

/** A small deterministic hash → [0, 1), so every render places things the same way. */
export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export const round = (v: number): number => Math.round(v * 100) / 100

export const clamp = (v: number, lo: number, hi: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo)

/**
 * A fat single-stroke script: [advance, main stroke, pen-lift strokes, lifts after?]. x-height 10, baseline 0,
 * y runs down. Every main stroke starts at (0, -1) and, unless it lifts, ends at (advance, -1), so letters chain
 * into one continuous path. Absolute M / L / C only, so x and y simply alternate.
 */
export const SCRIPT: Record<string, [number, string, string?, number?]> = {
  a: [10.2, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 -3C7.8 -0.8 8.8 -1 10.2 -1"],
  b: [9.4, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -6C2.4 -9 3.4 -10 4.8 -10C6.8 -10 8.2 -8 8.2 -5C8.2 -2 6.6 0 4.8 0C3.4 0 2.4 -0.6 1.8 -1.6C2.4 -0.6 3.4 0 4.8 0C6.6 0 7.8 -0.8 9.4 -1"],
  c: [8.8, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C5.6 -10 6.6 -9.6 7 -8.6C6.6 -9.6 5.6 -10 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6 0 7 -1 8.8 -1"],
  d: [10.2, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -19L7.8 -3C7.8 -0.8 8.8 -1 10.2 -1"],
  e: [9.4, "M0 -1C3.4 -2.4 8 -4.4 8 -7.6C8 -9.4 6.6 -10.4 4.8 -10.4C2.2 -10.4 0.8 -7.8 0.8 -5C0.8 -1.8 2.6 0 5 0C6.8 0 8 -1 9.4 -1"],
  f: [7, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 7.2C1.8 9.6 3.2 9.6 3.8 7.6C4.4 5 4.8 -1 7 -1", "M-0.4 -9.4L5.4 -9.4"],
  g: [9.6, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 4C7.8 8.6 5.8 9.6 4.2 9.6C2 9.6 1.4 7.6 2.8 6C4.6 4 7.4 1.4 9.6 -1"],
  h: [10, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -5.6C2.6 -8.6 4 -10 5.6 -10C7.2 -10 7.8 -8.8 7.8 -7L7.8 -3C7.8 -0.8 8.8 -1 10 -1"],
  i: [5, "M0 -1C1.2 -1.4 2 -6 2.2 -10L2.2 -3C2.2 -0.8 3.4 -1 5 -1", "M2.4 -15.2L2.5 -15.3"],
  j: [5.4, "M0 -1C1.2 -1.4 2 -6 2.2 -10L2.2 4.6C2.2 9.6 -0.6 9.8 -0.2 7.4C0.2 5 3.4 1.4 5.4 -1", "M2.4 -15.2L2.5 -15.3"],
  k: [9.6, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -4.6C3 -8 5.6 -10.4 7 -9.6C8.4 -8.6 7 -5.6 3.6 -5C5.6 -4.6 6.6 -1 9.6 -1"],
  l: [6.4, "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -3.2C1.8 -0.6 4 -1 6.4 -1"],
  m: [14.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.4 -8.6 3.4 -10 4.8 -10C6.2 -10 7 -9 7 -7L7 -1L7 -5.6C7.6 -8.6 8.6 -10 10 -10C11.4 -10 12.2 -9 12.2 -7L12.2 -3C12.2 -0.8 13.2 -1 14.6 -1"],
  n: [9.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.4 -8.6 3.4 -10 4.8 -10C6.4 -10 7.2 -9 7.2 -7L7.2 -3C7.2 -0.8 8.2 -1 9.6 -1"],
  o: [9, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5C7.6 -7.8 6.1 -10 4.3 -10C6 -10 7.4 -9.2 9 -9", "", 1],
  p: [9.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 9L1.8 -5.6C2.4 -8.6 3.4 -10 5 -10C7 -10 8.2 -8 8.2 -5C8.2 -2 6.6 0 4.8 0C3.4 0 2.4 -0.6 1.8 -1.6C2.4 -0.6 3.4 0 4.8 0C6.6 0 7.8 -0.8 9.6 -1"],
  q: [10.4, "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 9C8.8 6 9 0 10.4 -1"],
  r: [8.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.6 -8.6 4.2 -10 5.8 -10C6.8 -10 7.6 -9.6 8.2 -8.8", "", 1],
  s: [8.4, "M0 -1C1.6 -2 3 -7 4.4 -10.2C5.6 -8 7.4 -6 7.4 -3.6C7.4 -1.2 5.6 0 3.6 0C2 0 1 -0.6 0.6 -1.6C1 -0.6 2 0 3.6 0C5.6 0 6.8 -0.8 8.4 -1"],
  t: [6.6, "M0 -1C1 -1.4 2.2 -8 2.4 -15L2.4 -3.2C2.4 -0.8 4 -1 6.6 -1", "M-0.8 -9.6L6.2 -9.6"],
  u: [10, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -3.6C1.8 -1 3 0 4.6 0C6.2 0 7.4 -1.4 7.6 -4L7.6 -9.8L7.6 -3C7.6 -0.8 8.6 -1 10 -1"],
  v: [9, "M0 -1C1.2 -1.6 1.6 -6 1.6 -9.6C1.6 -6 2.6 0 4.4 0C6.4 0 7.6 -6 7.6 -9.6C8 -9 8.4 -8.8 9 -8.8", "", 1],
  w: [12.6, "M0 -1C1.2 -1.6 1.6 -6 1.6 -9.6L1.6 -3.6C1.6 -1 2.6 0 4 0C5.4 0 6.2 -1 6.2 -3.6L6.2 -8L6.2 -3.6C6.2 -1 7 0 8.4 0C9.8 0 10.8 -1 10.8 -3.6L10.8 -9.6C11.2 -9 11.8 -8.8 12.6 -8.8", "", 1],
  x: [9, "M0 -1C1.6 -2 2 -8.6 3 -9.6L7 -1C7.6 -0.4 8.4 -1 9 -1", "M7.4 -9.6L2.4 -0.4"],
  y: [9.6, "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -3.6C1.8 -1 3 0 4.6 0C6.2 0 7.4 -1.4 7.6 -4L7.6 -9.8L7.6 4.4C7.6 9 5.6 9.6 4.2 9.6C2 9.6 1.4 7.6 2.8 6C4.6 4 7.4 1.6 9.6 -1"],
  z: [8.8, "M0 -1C1 -2 1.4 -9.6 2.6 -9.6L7.4 -9.6L1.6 -0.2L6 -0.2C7 -0.2 7.8 -1 8.8 -1"],
  "!": [4, "M2 -16L2 -4.4", "M2 -0.6L2.1 -0.7", 1],
  ".": [3.6, "M1.8 -0.6L1.9 -0.7", "", 1],
}

/** Horizontal stretch and the gap between letters, in script units. */
export const SX = 1.22
export const TRACK = 1
export const WORD_GAP = 6

/** Shifts and stretches every x in an absolute M/L/C path. */
export const place = (d: string, dx: number, sx: number = SX): string => {
  let k = 0
  return d.replace(/-?\d*\.?\d+/g, (n) => (k++ % 2 === 0 ? String(round(+n * sx + dx)) : n))
}

export type ScriptBox = { x0: number; x1: number; top: number }
export type ScriptWord = { main: string; extra: string[]; width: number; top: number; bottom: number; boxes: ScriptBox[] }

const extent = (d: string): number[] => {
  const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  return n.filter((_, i) => i % 2 === 1)
}

/**
 * Lays text out in the script: one continuous main stroke (moves only where a letter lifts or a space falls) plus
 * the pen-lift strokes, drawn after. Case is ignored, accents are stripped, anything unknown is a space.
 */
export const layoutScript = (text: string): ScriptWord => {
  const clean = String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
  let x = 0
  let main = ""
  const extra: string[] = []
  const boxes: ScriptBox[] = []
  let lift = true
  let top = 0
  let bottom = 0
  for (const ch of clean) {
    const g = SCRIPT[ch]
    if (!g) {
      if (main) x += WORD_GAP
      lift = true
      continue
    }
    const d = place(g[1], x)
    main += lift ? d : "L" + d.slice(1)
    if (g[2]) extra.push(place(g[2], x))
    const ys = extent(g[1] + (g[2] ?? ""))
    const t = Math.min(...ys)
    top = Math.min(top, t)
    bottom = Math.max(bottom, ...ys)
    boxes.push({ x0: round(x), x1: round(x + g[0] * SX), top: t })
    lift = !!g[3]
    x += g[0] * SX + TRACK
  }
  return { main, extra, width: boxes.length ? round(x - TRACK) : 0, top, bottom, boxes }
}

/** A closed star: `points` spikes, alternating radii. `wobble` makes the spikes uneven, like a hand-cut sticker. */
export const starPath = (points: number, outer: number, inner: number, cx: number = 0, cy: number = 0, wobble: number = 0, seed: number = 0): string => {
  const n = Math.max(3, Math.floor(points) || 3)
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? inner : outer * (1 + (hash(i * 9.7 + seed) - 0.5) * wobble)
    pts.push(round(cx + Math.cos(a) * r) + " " + round(cy + Math.sin(a) * r))
  }
  return "M" + pts.join("L") + "Z"
}

export type Spot = { x: number; y: number; size: number; rotate: number; depth: number }

/**
 * Where n stickers land on a word, in script units: spread evenly along it, each riding the top of the letter
 * underneath (some perched above it, some slapped across the stroke), with a seeded tilt and a parallax depth.
 */
export const stickerSpots = (word: ScriptWord, n: number, seed: number = 0): Spot[] => {
  const count = Math.max(0, Math.floor(n) || 0)
  if (!count || !word.width) return []
  return Array.from({ length: count }, (_, i) => {
    const x = ((i + 0.5) / count) * word.width
    const box = word.boxes.find((b) => x >= b.x0 && x <= b.x1 + TRACK) ?? word.boxes[word.boxes.length - 1]
    const lift = [1.5, -5, -1, -7, 0.5, -4, -2][i % 7]
    return {
      x: round(x + (hash(i * 4.1 + seed) - 0.5) * 3),
      y: round(clamp(box.top + 2.5 + lift, word.top - 4, -4)),
      size: round(6.4 + hash(i * 2.3 + seed + 1) * 2.4),
      rotate: round((hash(i * 7.7 + seed + 2) - 0.5) * 34),
      depth: round(0.4 + hash(i * 5.5 + seed + 3) * 0.8),
    }
  })
}
// #endregion

export type StickerKind = "burst" | "smiley" | "heart" | "bubble" | "daisy" | "camera" | "bolt"

export type StickerSpec =
  | StickerKind
  | {
      kind?: StickerKind
      /** Your own sticker art (an <img>, an <svg>…). Replaces `kind`. */
      node?: React.ReactNode
      /** Accessible name, e.g. "Smiley sticker". */
      label?: string
      /** Text on the burst / bubble stickers. */
      text?: string
      /** Position in % of the wordmark box; omit to let it find a letter. */
      x?: number
      y?: number
      /** Width in % of the wordmark box. */
      size?: number
      rotate?: number
    }

export type SocialKind = "linkedin" | "instagram" | "tiktok" | "x" | "youtube" | "dribbble"
export type Social = { kind: SocialKind; href: string; label?: string }
export type Job = { title: string; href?: string }
export type Credit = { role: string; name: string }

export interface StickerSlapFooterProps {
  /** The giant script wordmark. Letters a–z, `!` and `.`; anything else is a space. */
  wordmark?: string
  /** Where the small wordmark in the top bar points. */
  homeHref?: string
  /** The starburst link in the top-left corner. `""` hides it. */
  navLabel?: string
  navHref?: string
  /** Messaging link: the top-right bubble and the contact line. `""` hides both. */
  chatHref?: string
  chatLabel?: string
  jobsLabel?: string
  /** `[]` hides the column. */
  jobs?: Job[]
  officeLabel?: string
  /** One entry per line. `[]` hides the column. */
  address?: string[]
  mapLabel?: string
  mapHref?: string
  contactLabel?: string
  /** Click copies it (falls back to `mailto:`). `""` hides it. */
  email?: string
  copiedLabel?: string
  /** Small print under the contact lines. `""` hides it. */
  note?: string
  socials?: Social[]
  stickers?: StickerSpec[]
  /** `[]` hides the credits pill. */
  credits?: Credit[]
  /** A row on the black panel under the columns (policy links, ©). */
  bottom?: React.ReactNode
  /** Minimum height. Any definite CSS length. */
  height?: string
  /** Caps the wordmark's height so short words don't get enormous. */
  wordmarkMaxHeight?: string
  /** The frame. */
  paper?: string
  /** The panel. */
  panel?: string
  /** Text on the frame and the tags. */
  ink?: string
  /** The wordmark and the panel text. Defaults to `paper`. */
  cream?: string
  /** The nav starburst. */
  accent?: string
  fontSans?: string
  onStickerMove?: (index: number, x: number, y: number) => void
  className?: string
}

const DEFAULT_JOBS: Job[] = [{ title: "senior motion designer", href: "#" }, { title: "junior producer", href: "#" }]
const DEFAULT_SOCIALS: Social[] = [
  { kind: "linkedin", href: "#" },
  { kind: "instagram", href: "#" },
  { kind: "tiktok", href: "#" },
]
const DEFAULT_STICKERS: StickerSpec[] = ["burst", "smiley", "heart", "daisy", "bubble", "camera"]
const DEFAULT_CREDITS: Credit[] = [
  { role: "design & code", name: "the sunny crew" },
  { role: "stickers", name: "drawn in code, peel freely" },
  { role: "type", name: "a felt-tip and your system font" },
]

const LABELS: Record<StickerKind, string> = {
  burst: "Wow burst sticker",
  smiley: "Smiley sticker",
  heart: "Heart sticker",
  bubble: "Speech bubble sticker",
  daisy: "Daisy sticker",
  camera: "Camera sticker",
  bolt: "Lightning bolt sticker",
}

/** How far below the baseline the panel edge cuts the wordmark, in script units. */
const CUT = -1.2
const STROKE = 3.3
/** The script leans: tan(9°). */
const SLANT = 0.1584

const SQUIGGLE = "M1 5C7 1 11 1 15 4S24 8 29 4S38 0 43 4S52 8 57 4S66 1 71 4S80 7 87 3"

const ICONS: Record<SocialKind, React.ReactNode> = {
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M8 10.5V16.5M12 16.5V10.5M12 13.2C12 11.6 13.1 10.4 14.6 10.4C16.1 10.4 17 11.4 17 13.1V16.5" />
      <path className="ssf-dot" d="M8 7.4L8 7.5" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5.2" />
      <circle cx="12" cy="12" r="3.8" />
      <path className="ssf-dot" d="M16.9 7.1L16.9 7.2" />
    </>
  ),
  tiktok: <path d="M13.6 4V15A3.3 3.3 0 1 1 10.3 11.7M13.6 4C14 6.6 15.8 8.2 18.4 8.4" />,
  x: <path d="M5 4.5H8.8L19 19.5H15.2ZM18.6 4.5L13.3 10.5M5.4 19.5L10.7 13.5" />,
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12.4" rx="4" />
      <path d="M10.4 9.6L14.6 12.2L10.4 14.8Z" />
    </>
  ),
  dribbble: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7.4 4.9C11 9 13.6 14 15 20.2M3.6 10.6C9 11 14 9.6 18 6.2M5.6 17.6C8.6 14 13 12.6 20.4 13.4" />
    </>
  ),
}

const CSS =
  ".ssf{position:relative;isolation:isolate;overflow:hidden;overflow:clip;container-type:inline-size;display:flex;flex-direction:column;width:100%;box-sizing:border-box;padding:0 clamp(6px,.9cqw,12px) clamp(6px,.9cqw,12px);background:var(--ssf-paper);color:var(--ssf-ink);font-family:var(--ssf-sans);font-weight:500;-webkit-font-smoothing:antialiased}" +
  ":where(.ssf) *,:where(.ssf) *::before,:where(.ssf) *::after{box-sizing:border-box}" +
  ":where(.ssf) button{appearance:none;background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer}" +
  ":where(.ssf) a{color:inherit;text-decoration:none}" +
  ":where(.ssf) ul,:where(.ssf) p,:where(.ssf) h3{margin:0;padding:0;list-style:none;font:inherit}" +
  ".ssf svg{display:block;max-width:none;overflow:visible}" +
  ".ssf :focus-visible{outline:2.5px solid var(--ssf-accent);outline-offset:3px;border-radius:6px}" +
  ".ssf-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}" +
  // top bar
  ".ssf-top{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:clamp(14px,2cqw,26px) clamp(10px,1.6cqw,22px) clamp(24px,5cqw,80px)}" +
  ".ssf-nav{justify-self:start;position:relative;display:grid;place-items:center;width:clamp(58px,6.2cqw,80px);height:clamp(42px,4.4cqw,56px);font-weight:800;font-size:clamp(15px,1.6cqw,20px);letter-spacing:-.02em;color:var(--ssf-ink)}" +
  ".ssf-nav svg{position:absolute;left:-6%;top:-14%;width:72%;height:auto;color:var(--ssf-accent);transition:transform .7s cubic-bezier(.2,1.4,.3,1)}" +
  ".ssf-nav span{position:relative;transition:transform .4s cubic-bezier(.2,1.6,.3,1)}" +
  ".ssf-nav:hover svg{transform:rotate(72deg) scale(1.12)}" +
  ".ssf-nav:hover span{transform:rotate(-6deg) scale(1.06)}" +
  ".ssf-logo{display:block;color:var(--ssf-ink)}" +
  ".ssf-logo svg{height:clamp(24px,2.5cqw,34px);width:auto}" +
  ".ssf-logo path{fill:none;stroke:currentColor;stroke-width:3.3;stroke-linecap:round;stroke-linejoin:round}" +
  ".ssf-chat{justify-self:end;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:var(--ssf-ink);transition:transform .45s cubic-bezier(.2,1.6,.3,1)}" +
  ".ssf-chat svg{width:24px;height:24px}" +
  ".ssf-chat:hover{transform:rotate(-14deg) scale(1.12)}" +
  // panel
  ".ssf-panel{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;overflow:hidden;overflow:clip;border-radius:clamp(14px,1.8cqw,24px);background:var(--ssf-panel);color:var(--ssf-cream);transform-origin:50% 100%}" +
  ".ssf-cols{position:relative;z-index:2;display:grid;grid-template-columns:repeat(var(--ssf-n,3),minmax(0,1fr));gap:clamp(22px,3cqw,44px) clamp(16px,2.4cqw,36px);padding:clamp(26px,5.4cqw,72px) clamp(18px,1.8cqw,26px) clamp(20px,3cqw,40px)}" +
  ".ssf-col{display:flex;flex-direction:column;align-items:flex-start;min-width:0}" +
  ".ssf-tag{display:inline-block;margin-bottom:clamp(14px,1.6cqw,22px);padding:.28em .72em .32em;border-radius:999px;background:var(--ssf-cream);color:var(--ssf-ink);font-size:clamp(12px,1.05cqw,14px);font-weight:600;line-height:1.2;letter-spacing:-.005em}" +
  ".ssf-big{font-size:clamp(19px,2.1cqw,30px);font-weight:800;line-height:1.16;letter-spacing:-.022em}" +
  ".ssf-line{display:block;overflow:hidden;overflow:clip;padding:0 .08em .06em;margin:0 -.08em -.06em}" +
  ".ssf-line>*{display:inline-block}" +
  ".ssf-big a,.ssf-big button{position:relative;text-align:left;transition:color .2s}" +
  ".ssf-big a::after,.ssf-big button::after{content:'';position:absolute;left:0;right:0;bottom:-.02em;height:.09em;border-radius:1em;background:currentColor;transform:scaleX(0);transform-origin:100% 50%;transition:transform .45s cubic-bezier(.6,0,.2,1)}" +
  ".ssf-big a:hover::after,.ssf-big button:hover::after,.ssf-big a:focus-visible::after,.ssf-big button:focus-visible::after{transform:scaleX(1);transform-origin:0 50%}" +
  ".ssf-copy{display:inline-grid !important}" +
  ".ssf-copy>span{grid-area:1/1;transition:transform .5s cubic-bezier(.2,1.2,.3,1),opacity .3s}" +
  ".ssf-copy .ssf-done{transform:translateY(105%);opacity:0}" +
  ".ssf-copy.is-copied .ssf-addr{transform:translateY(-105%);opacity:0}" +
  ".ssf-copy.is-copied .ssf-done{transform:none;opacity:1}" +
  ".ssf-ast{display:inline-block;margin-left:.04em;transition:transform .6s cubic-bezier(.2,1.6,.3,1)}" +
  ".ssf-big a:hover .ssf-ast{transform:rotate(180deg) scale(1.2)}" +
  ".ssf-map{position:relative;display:inline-block;margin-top:clamp(16px,1.8cqw,24px);font-size:clamp(14px,1.25cqw,17px);font-weight:700;letter-spacing:-.01em;padding-bottom:.55em}" +
  ".ssf-map svg{position:absolute;left:-2%;bottom:0;width:104%;height:.5em}" +
  ".ssf-map path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:var(--l,120px) var(--l,120px);stroke-dashoffset:0}" +
  ".ssf-map:hover path,.ssf-map:focus-visible path{animation:ssf-rewrite .7s cubic-bezier(.6,0,.3,1)}" +
  ".ssf-note{margin-top:clamp(12px,1.3cqw,18px);max-width:34ch;font-size:clamp(11px,.92cqw,13px);line-height:1.45;opacity:.82}" +
  ".ssf-socials{display:flex;gap:clamp(8px,.9cqw,12px);margin-top:clamp(16px,2cqw,26px)}" +
  ".ssf-soc{display:grid;place-items:center;width:clamp(34px,2.9cqw,40px);height:clamp(34px,2.9cqw,40px);border-radius:12px;color:var(--ssf-cream);box-shadow:inset 0 0 0 1.5px color-mix(in oklab,var(--ssf-cream) 45%,transparent);transition:background .25s,color .25s,box-shadow .25s,transform .45s cubic-bezier(.2,1.6,.3,1)}" +
  ".ssf-soc svg{width:58%;height:58%}" +
  ".ssf-soc svg *{fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}" +
  ".ssf-soc .ssf-dot{stroke-width:2.8}" +
  ".ssf-soc:hover,.ssf-soc:focus-visible{background:var(--ssf-cream);color:var(--ssf-panel);box-shadow:inset 0 0 0 1.5px var(--ssf-cream);transform:translateY(-3px) rotate(-8deg)}" +
  // the wordmark stage
  ".ssf-stage{position:relative;z-index:1;margin-top:auto;width:min(100%,calc(var(--ssf-wmh) * var(--ssf-ar)));align-self:center;padding:0 clamp(6px,.8cqw,12px)}" +
  ".ssf-stage-in{position:relative;container-type:inline-size}" +
  ".ssf-wm-btn{display:block;width:100%;border-radius:0 !important;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
  ".ssf-wm{width:100%;height:auto;color:var(--ssf-cream)}" +
  ".ssf-wm path{fill:none;stroke:currentColor;stroke-width:" + STROKE + ";stroke-linecap:round;stroke-linejoin:round}" +
  // stickers
  ".ssf-st{position:absolute;z-index:3;translate:-50% -50%;touch-action:none;user-select:none;-webkit-user-select:none}" +
  ".ssf-st-btn{display:block;width:100%;cursor:grab;rotate:calc(var(--r) + var(--tilt,0deg));transition:rotate .5s cubic-bezier(.2,1.4,.3,1)}" +
  ".ssf-st.is-drag{z-index:9}" +
  ".ssf-st.is-drag .ssf-st-btn{cursor:grabbing;transition:rotate .12s linear}" +
  ".ssf-st-lift{display:block;transition:transform .35s cubic-bezier(.2,1.5,.3,1),filter .35s}" +
  ".ssf-st-lift{filter:drop-shadow(0 1px .5px rgba(10,16,60,.28)) drop-shadow(0 4px 6px rgba(10,16,60,.18))}" +
  ".ssf-st-btn:hover .ssf-st-lift,.ssf-st-btn:focus-visible .ssf-st-lift{transform:translateY(-4%) scale(1.06);filter:drop-shadow(0 2px 1px rgba(10,16,60,.2)) drop-shadow(0 14px 16px rgba(10,16,60,.3))}" +
  ".ssf-st.is-drag .ssf-st-lift{transform:translateY(-7%) scale(1.12);filter:drop-shadow(0 2px 1px rgba(10,16,60,.16)) drop-shadow(0 22px 22px rgba(10,16,60,.34))}" +
  ".ssf-st-slap{display:block}" +
  ".ssf-st svg{width:100%;height:auto}" +
  ".ssf-sheen{transform:translateX(-130%);transition:transform 0s}" +
  ".ssf-st-btn:hover .ssf-sheen{transform:translateX(130%);transition:transform .9s cubic-bezier(.4,0,.2,1)}" +
  ".ssf-ring{position:absolute;left:50%;top:50%;width:150%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;border:2px solid var(--ssf-cream);opacity:0;pointer-events:none}" +
  // credits
  ".ssf-bottom{position:relative;z-index:2;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 24px;margin:0 clamp(18px,1.8cqw,26px);padding:14px 0 clamp(14px,2cqw,26px);border-top:1px solid rgba(245,242,234,.16);font-size:clamp(13px,1cqw,15px);color:rgba(245,242,234,.62)}" +
  ".ssf-bottom a{color:var(--ssf-cream)}" +
  ".ssf-bottom a:hover{color:var(--ssf-accent)}" +
  ".ssf-credits{position:absolute;z-index:6;right:clamp(10px,1.2cqw,16px);bottom:clamp(10px,1.2cqw,16px)}" +
  ".ssf-pill{display:block;padding:.3em .8em .34em;border-radius:999px;background:var(--ssf-ink);color:var(--ssf-paper);font-size:clamp(12px,1cqw,14px);font-weight:600;transition:transform .4s cubic-bezier(.2,1.6,.3,1),background .2s}" +
  ".ssf-pill:hover{transform:rotate(-5deg) scale(1.06)}" +
  ".ssf-pop{position:absolute;right:0;bottom:calc(100% + 10px);width:max-content;max-width:min(300px,80cqw);padding:14px 16px;border-radius:16px;background:var(--ssf-paper);color:var(--ssf-ink);box-shadow:0 0 0 4px #fff,0 18px 40px rgba(10,16,60,.35);transform-origin:90% 100%;animation:ssf-popin .45s cubic-bezier(.2,1.5,.3,1)}" +
  ".ssf-pop li{display:flex;flex-direction:column;padding:6px 0;font-size:13px;line-height:1.3}" +
  ".ssf-pop li+li{border-top:1.5px dashed color-mix(in oklab,var(--ssf-ink) 22%,transparent)}" +
  ".ssf-pop b{font-size:11px;font-weight:600;opacity:.6;text-transform:lowercase}" +
  ".ssf-pop strong{font-weight:800;letter-spacing:-.01em}" +
  "@container (max-width: 760px){.ssf-cols{grid-template-columns:minmax(0,1fr)}.ssf-top{padding-bottom:24px}.ssf-stage{width:100%}}" +
  "@keyframes ssf-rewrite{0%{stroke-dashoffset:var(--l,120px)}100%{stroke-dashoffset:0}}" +
  "@keyframes ssf-popin{from{opacity:0;transform:translateY(10px) scale(.7) rotate(4deg)}}" +
  // the storyboard: everything above is the finished state; motion only adds the way in
  "@media (prefers-reduced-motion: no-preference){" +
  ".ssf-panel{scale:calc(.9 + .1 * var(--ssf-sp,1));border-radius:calc(clamp(14px,1.8cqw,24px) + (1 - var(--ssf-sp,1)) * 60px)}" +
  ".ssf-stage-in{transform:translateY(calc((1 - var(--ssf-sp,1)) * 18%))}" +
  ".ssf-st{transform:translate(calc(var(--ssf-px,0) * var(--d) * 9px),calc(var(--ssf-py,0) * var(--d) * 6px));transition:transform .7s cubic-bezier(.2,.8,.2,1)}" +
  ".ssf-st.is-drag{transition:none}" +
  ".ssf:not(.is-in) .ssf-top>*,.ssf:not(.is-in) .ssf-tag,.ssf:not(.is-in) .ssf-line>*,.ssf:not(.is-in) .ssf-map,.ssf:not(.is-in) .ssf-note,.ssf:not(.is-in) .ssf-soc,.ssf:not(.is-in) .ssf-pill{opacity:0}" +
  ".ssf.is-in .ssf-top>*{animation:ssf-fall .8s cubic-bezier(.2,1.3,.3,1) both}" +
  ".ssf.is-in .ssf-top>:nth-child(2){animation-delay:.08s}.ssf.is-in .ssf-top>:nth-child(3){animation-delay:.16s}" +
  ".ssf.is-in .ssf-panel{animation:ssf-grow 1.1s cubic-bezier(.7,0,.2,1) both}" +
  ".ssf.is-in .ssf-tag{animation:ssf-pop .7s cubic-bezier(.2,1.7,.3,1) both;animation-delay:calc(.45s + var(--c) * .1s)}" +
  ".ssf.is-in .ssf-line>*{animation:ssf-rise .8s cubic-bezier(.2,.9,.2,1) both;animation-delay:calc(.55s + var(--c) * .1s + var(--i) * .07s)}" +
  ".ssf.is-in .ssf-map,.ssf.is-in .ssf-note{animation:ssf-fade .7s ease both;animation-delay:calc(.85s + var(--c) * .1s)}" +
  ".ssf.is-in .ssf-soc{animation:ssf-pop .6s cubic-bezier(.2,1.7,.3,1) both;animation-delay:calc(1s + var(--i) * .08s)}" +
  ".ssf.is-in .ssf-pill{animation:ssf-pop .6s cubic-bezier(.2,1.7,.3,1) both;animation-delay:var(--end)}" +
  ".ssf .ssf-wm path{stroke-dasharray:var(--l,3000px) calc(var(--l,3000px) + 8px);stroke-dashoffset:calc(var(--l,3000px) + 4px)}" +
  ".ssf:not(.is-in) .ssf-wm path{visibility:hidden}" +
  ".ssf.is-in .ssf-wm path{animation:ssf-write var(--dur) var(--at) cubic-bezier(.55,.1,.35,1) both}" +
  ".ssf:not(.is-in) .ssf-st-slap{opacity:0}" +
  ".ssf.is-in .ssf-st-slap{animation:ssf-slap .62s var(--at) cubic-bezier(.3,1.5,.4,1) both}" +
  ".ssf.is-in .ssf-ring{animation:ssf-ring .7s var(--at) cubic-bezier(.2,.8,.2,1) both}" +
  ".ssf-logo:hover path{animation:ssf-rewrite 1.1s cubic-bezier(.55,.1,.35,1)}" +
  ".ssf-logo path{stroke-dasharray:var(--l,3000px) calc(var(--l,3000px) + 8px)}" +
  ".ssf-st-btn:active .ssf-st-lift{transform:translateY(-6%) scale(1.1)}" +
  "}" +
  "@keyframes ssf-write{0%{stroke-dashoffset:calc(var(--l,3000px) + 4px);visibility:visible}100%{stroke-dashoffset:0;visibility:visible}}" +
  "@keyframes ssf-fall{from{opacity:0;transform:translateY(-14px) rotate(-6deg)}}" +
  "@keyframes ssf-grow{0%{clip-path:inset(30% 12% 0 12% round 80px);transform:translateY(40px)}100%{clip-path:inset(0 0 0 0 round 0);transform:none}}" +
  "@keyframes ssf-pop{0%{opacity:0;transform:scale(.4) rotate(-12deg)}100%{opacity:1;transform:none}}" +
  "@keyframes ssf-rise{from{opacity:1;transform:translateY(110%)}to{opacity:1;transform:none}}" +
  "@keyframes ssf-fade{from{opacity:0;transform:translateY(8px)}}" +
  "@keyframes ssf-slap{0%{opacity:0;transform:scale(2.1) rotate(24deg) translateY(-30%);filter:blur(1.5px)}55%{opacity:1;transform:scale(.9) rotate(-3deg);filter:none}78%{transform:scale(1.05) rotate(1deg)}100%{opacity:1;transform:none}}" +
  "@keyframes ssf-ring{0%{opacity:0;transform:scale(.3)}40%{opacity:.75}100%{opacity:0;transform:scale(1)}}"

/** Stamps each path's real length into --l, for the draw-in. */
const useStrokeLengths = (ref: React.RefObject<Element | null>, key: string) =>
  React.useEffect(() => {
    ref.current?.querySelectorAll<SVGPathElement>("path[data-draw]").forEach((p) => {
      p.style.setProperty("--l", Math.ceil(p.getTotalLength()) + 1 + "px")
    })
  }, [ref, key])

/** A word in the script, scaled to fit a box: for sticker captions. */
function ScriptText({ text, cx, cy, w, color, stroke = STROKE }: { text: string; cx: number; cy: number; w: number; color: string; stroke?: number }) {
  const { main, extra, width, top } = React.useMemo(() => layoutScript(text), [text])
  if (!width) return null
  const s = w / (width + stroke)
  const h = (-top + 1) * s
  return (
    <g transform={"translate(" + round(cx - (width * s) / 2) + " " + round(cy + h / 2 - s) + ") scale(" + round(s) + ")"}>
      <path d={main + extra.join("")} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

const sparkle = (cx: number, cy: number, r: number) =>
  "M" + cx + " " + (cy - r) + "Q" + cx + " " + cy + " " + (cx + r) + " " + cy + "Q" + cx + " " + cy + " " + cx + " " + (cy + r) + "Q" + cx + " " + cy + " " + (cx - r) + " " + cy + "Q" + cx + " " + cy + " " + cx + " " + (cy - r) + "Z"

const BURST = starPath(13, 54, 39, 60, 60, 0.2, 4)
const BOLT = "M70 8L26 66H55L44 112L94 48H64Z"
const HEART = "M60 100C22 76 10 56 18 38C26 20 50 18 60 38C70 18 94 20 102 38C110 56 98 76 60 100Z"
const BUBBLE = "M24 22H96A14 14 0 0 1 110 36V70A14 14 0 0 1 96 84H56L34 102L38 84H24A14 14 0 0 1 10 70V36A14 14 0 0 1 24 22Z"

/** The silhouette (die-cut in white) and the art on top, in a 120 × 120 box. */
const stickerArt = (kind: StickerKind, text?: string): { shape: React.ReactNode; art: React.ReactNode } => {
  switch (kind) {
    case "burst":
      return {
        shape: <path d={BURST} />,
        art: (
          <>
            <path d={BURST} fill="#ff6a2b" />
            <path d={starPath(13, 44, 33, 60, 60, 0.2, 4)} fill="#ff8a4c" />
            <ScriptText text={text ?? "wow"} cx={60} cy={58} w={62} color="#1b1230" stroke={3.4} />
          </>
        ),
      }
    case "smiley":
      return {
        shape: <circle cx="60" cy="60" r="50" />,
        art: (
          <>
            <circle cx="60" cy="60" r="50" fill="#9ab8ff" />
            <circle cx="60" cy="60" r="40" fill="none" stroke="#fff" strokeWidth="3" opacity=".9" />
            <ellipse cx="47" cy="50" rx="4" ry="7.5" fill="#fff" />
            <ellipse cx="73" cy="50" rx="4" ry="7.5" fill="#fff" />
            <path d="M36 66Q60 92 84 66M32 63L39 69M88 63L81 69" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          </>
        ),
      }
    case "heart":
      return {
        shape: (
          <>
            <path d={HEART} />
            <path d={sparkle(100, 20, 14)} />
            <path d={sparkle(18, 92, 10)} />
          </>
        ),
        art: (
          <>
            <path d={HEART} fill="#b0245e" />
            <path d="M30 42Q32 30 45 29" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" opacity=".9" />
            <path d={sparkle(100, 20, 14)} fill="#ffd0e3" />
            <path d={sparkle(18, 92, 10)} fill="#ffd0e3" />
          </>
        ),
      }
    case "bubble":
      return {
        shape: <path d={BUBBLE} />,
        art: (
          <>
            <path d={BUBBLE} fill="#ffb6e1" />
            <ScriptText text={text ?? "hi!"} cx={60} cy={53} w={text ? 76 : 44} color="#8a1550" stroke={3.6} />
          </>
        ),
      }
    case "daisy": {
      const petals = Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx="60" cy="31" rx="13" ry="22" transform={"rotate(" + i * 40 + " 60 60)"} />)
      return {
        shape: <>{petals}</>,
        art: (
          <>
            <g fill="#ffd23f">{petals}</g>
            <circle cx="60" cy="60" r="19" fill="#ff6a2b" />
            <circle cx="53.5" cy="57" r="2.6" fill="#1b1230" />
            <circle cx="66.5" cy="57" r="2.6" fill="#1b1230" />
            <path d="M53 65Q60 71 67 65" fill="none" stroke="#1b1230" strokeWidth="3" strokeLinecap="round" />
          </>
        ),
      }
    }
    case "camera":
      return {
        shape: (
          <>
            <rect x="12" y="36" width="96" height="66" rx="16" />
            <rect x="38" y="24" width="36" height="20" rx="6" />
          </>
        ),
        art: (
          <>
            <rect x="12" y="36" width="96" height="66" rx="16" fill="#1d1c22" />
            <rect x="38" y="24" width="36" height="20" rx="6" fill="#1d1c22" />
            <circle cx="60" cy="70" r="24" fill="#fff" />
            <circle cx="60" cy="70" r="17" fill="#1d1c22" />
            <circle cx="60" cy="70" r="11" fill="#5b7cff" />
            <circle cx="55" cy="65" r="4" fill="#fff" />
            <rect x="86" y="46" width="12" height="7" rx="3" fill="#ffd23f" />
            <path d="M22 50H30" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
          </>
        ),
      }
    case "bolt":
    default:
      return {
        shape: <path d={BOLT} />,
        art: (
          <>
            <path d={BOLT} fill="#ffd23f" />
            <path d="M66 20L38 58" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".75" />
          </>
        ),
      }
  }
}

function StickerSvg({ kind, text }: { kind: StickerKind; text?: string }) {
  const id = "ssf" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const { shape, art } = stickerArt(kind, text)
  return (
    <svg viewBox="-6 -6 132 132" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id + "c"}>{shape}</clipPath>
        <linearGradient id={id + "g"} x1="0" x2="1" y1="0" y2="0">
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="#fff" stroke="#fff" strokeWidth="11" strokeLinejoin="round">
        {shape}
      </g>
      {art}
      <g clipPath={"url(#" + id + "c)"}>
        <g transform="rotate(20 60 60)">
          <rect className="ssf-sheen" x="-30" y="-30" width="180" height="180" fill={"url(#" + id + "g)"} />
        </g>
      </g>
    </svg>
  )
}

const isExternal = (href?: string) => !!href && /^https?:/.test(href)
const linkProps = (href?: string) => ({
  href: href || "#",
  target: isExternal(href) ? "_blank" : undefined,
  rel: isExternal(href) ? "noopener noreferrer" : undefined,
  onClick: (e: React.MouseEvent) => {
    if (!href || href === "#") e.preventDefault()
  },
})

type Placed = { x: number; y: number }

export default function StickerSlapFooter({
  wordmark = "sunny",
  homeHref = "#",
  navLabel = "work",
  navHref = "#",
  chatHref = "#",
  chatLabel = "send us a voice note",
  jobsLabel = "looking for a job?",
  jobs = DEFAULT_JOBS,
  officeLabel = "office",
  address = ["17 bakery lane", "brooklyn, ny 11211"],
  mapLabel = "Google Maps",
  mapHref = "#",
  contactLabel = "contact",
  email = "hello@sunny.studio",
  copiedLabel = "copied, talk soon!",
  note = "*phone calls give us the jitters. texts and voice notes are lovely.",
  socials = DEFAULT_SOCIALS,
  stickers = DEFAULT_STICKERS,
  credits = DEFAULT_CREDITS,
  height = "100svh",
  wordmarkMaxHeight = "50svh",
  paper = "#f1ece4",
  panel = "#4a6cf0",
  ink = "#141414",
  cream,
  accent = "#ff6a2b",
  fontSans = "'DM Sans', 'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  onStickerMove,
  className = "",
  bottom,
}: StickerSlapFooterProps) {
  const rootRef = React.useRef<HTMLElement>(null)
  const stageRef = React.useRef<HTMLDivElement>(null)
  const popRef = React.useRef<HTMLDivElement>(null)
  const [seen, setSeen] = React.useState(false) // the same on the server and the first paint
  const [run, setRun] = React.useState(0)
  const [copied, setCopied] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  const [moved, setMoved] = React.useState<Record<number, Placed>>({})
  const [order, setOrder] = React.useState<number[]>([])
  const drag = React.useRef<{ i: number; id: number; sx: number; sy: number; px: number; py: number; lx: number; t: number; tilt: number; w: number; h: number; went: boolean } | null>(null)

  const word = React.useMemo(() => layoutScript(wordmark), [wordmark])
  const small = word
  const pad = STROKE / 2 + 0.6
  const vbX = -1.4 - pad
  const vbY = word.top - pad
  const vbW = Math.max(word.width, 1) + 2.8 + pad * 2 - word.top * SLANT
  const vbH = word.bottom + pad - vbY
  const cutH = CUT - vbY
  const smallVb = [-pad - 1, small.top - pad, Math.max(small.width, 1) + pad * 2 + 2 - small.top * SLANT, -small.top + pad * 2 + 1].map(round).join(" ")

  const spots = React.useMemo(() => stickerSpots(word, stickers.length, 3), [word, stickers.length])
  const drawDur = clamp(0.7 + word.width / 45, 1.1, 2.6)
  const writeAt = 1.05
  const toPct = (s: Spot) => ({ x: ((s.x - s.y * SLANT - vbX) / vbW) * 100, y: ((s.y - vbY) / vbH) * 100 })

  const items = stickers.map((spec, i) => {
    const o = typeof spec === "string" ? { kind: spec } : spec
    const spot = spots[i] ?? { x: 0, y: 0, size: 11, rotate: 0, depth: 1 }
    const auto = toPct(spot)
    const home = { x: o.x ?? auto.x, y: o.y ?? auto.y }
    const xf = clamp((home.x / 100) * vbW + vbX, 0, word.width) / Math.max(word.width, 1)
    return {
      i,
      kind: (o.kind ?? "burst") as StickerKind,
      node: o.node,
      text: o.text,
      label: o.label ?? LABELS[(o.kind ?? "burst") as StickerKind],
      home,
      at: moved[i] ?? home,
      size: o.size ?? (spot.size / vbW) * 100,
      rotate: o.rotate ?? spot.rotate,
      depth: spot.depth,
      // slaps down the moment the pen passes under it
      delay: writeAt + drawDur * Math.pow(xf, 0.92) + 0.08,
    }
  })
  const endAt = writeAt + drawDur + word.extra.length * 0.16 + 0.5

  useStrokeLengths(rootRef, wordmark + run)

  // The storyboard plays once, the first time a fifth of it is on screen.
  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") { // very old browsers: shown straight away
      const id = requestAnimationFrame(() => setSeen(true))
      return () => cancelAnimationFrame(id)
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Scroll-linked: 0 while the footer is still below the fold, 1 once it fills the screen (or is entirely in
  // view), eased into --ssf-sp.
  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = document.documentElement.clientHeight || r.height
      const span = Math.min(r.height, vh) || 1
      const p = clamp((vh - r.top) / span, 0, 1)
      el.style.setProperty("--ssf-sp", (1 - Math.pow(1 - p, 2)).toFixed(4))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    addEventListener("scroll", onScroll, { passive: true, capture: true })
    addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener("scroll", onScroll, { capture: true })
      removeEventListener("resize", onScroll)
    }
  }, [])

  React.useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(0), 2200)
    return () => clearTimeout(id)
  }, [copied])

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  const copy = async () => {
    if (!email) return
    try {
      await navigator.clipboard.writeText(email)
      setCopied((c) => c + 1)
    } catch {
      window.location.href = "mailto:" + email
    }
  }

  const raise = (i: number) => setOrder((o) => [...o.filter((k) => k !== i), i])

  const putAt = (i: number, p: Placed, announce: boolean = true) => {
    setMoved((m) => ({ ...m, [i]: p }))
    if (announce) onStickerMove?.(i, round(p.x), round(p.y))
  }

  const wiggle = (el: Element | null, frames: Keyframe[], duration: number) => {
    if (!reduced()) (el as HTMLElement | null)?.animate?.(frames, { duration, easing: "cubic-bezier(.3,1.4,.4,1)" })
  }
  const slapFrames: Keyframe[] = [{ transform: "scale(1.14)" }, { transform: "scale(.93,1.04)", offset: 0.4 }, { transform: "scale(1.02,.98)", offset: 0.7 }, { transform: "none" }]
  const shakeFrames: Keyframe[] = [{ transform: "none" }, { transform: "rotate(-14deg) scale(1.1)", offset: 0.3 }, { transform: "rotate(9deg)", offset: 0.6 }, { transform: "none" }]

  const onDown = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    if (e.button !== 0 || !stageRef.current) return
    const r = stageRef.current.getBoundingClientRect()
    const at = items[i].at
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { i, id: e.pointerId, sx: at.x, sy: at.y, px: e.clientX, py: e.clientY, lx: e.clientX, t: e.timeStamp, tilt: 0, w: r.width, h: r.height, went: false }
    raise(i)
  }
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (!d.went && Math.hypot(dx, dy) < 4) return
    const host = e.currentTarget.parentElement
    if (!host) return
    if (!d.went) host.classList.add("is-drag")
    d.went = true
    const x = clamp(d.sx + (dx / d.w) * 100, 1, 99)
    const y = clamp(d.sy + (dy / d.h) * 100, -70, 96)
    host.style.left = x + "%"
    host.style.top = y + "%"
    // tilt with the throw: velocity, smoothed
    const now = e.timeStamp // the event's own time (same clock as performance.now)
    const v = (e.clientX - d.lx) / Math.max(1, now - d.t)
    d.tilt = d.tilt * 0.75 + clamp(v * 22, -24, 24) * 0.25
    d.lx = e.clientX
    d.t = now
    host.style.setProperty("--tilt", d.tilt.toFixed(2) + "deg")
  }
  const onUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const host = e.currentTarget.parentElement
    host?.classList.remove("is-drag")
    host?.style.setProperty("--tilt", "0deg")
    const lift = e.currentTarget.querySelector(".ssf-st-lift")
    if (d.went && host) {
      putAt(d.i, { x: parseFloat(host.style.left), y: parseFloat(host.style.top) })
      wiggle(lift, slapFrames, 420)
    } else wiggle(lift, shakeFrames, 520)
  }
  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.shiftKey ? 6 : 2
    const at = items[i].at
    const go: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (go[e.key]) {
      e.preventDefault()
      raise(i)
      putAt(i, { x: clamp(at.x + go[e.key][0], 1, 99), y: clamp(at.y + go[e.key][1], -70, 96) })
    } else if (e.key === "Home" || e.key === "Escape") {
      e.preventDefault()
      goHome(i, e.currentTarget)
    }
  }
  const goHome = (i: number, btn: HTMLElement) => {
    setMoved((m) => {
      const next = { ...m }
      delete next[i]
      return next
    })
    onStickerMove?.(i, round(items[i].home.x), round(items[i].home.y))
    wiggle(btn.querySelector(".ssf-st-lift"), slapFrames, 420)
  }

  // Write it again: the wordmark redraws and every sticker slaps back home.
  const replay = () => {
    setMoved({})
    setRun((r) => r + 1)
  }

  const style = {
    "--ssf-paper": paper,
    "--ssf-panel": panel,
    "--ssf-ink": ink,
    "--ssf-cream": cream ?? paper,
    "--ssf-accent": accent,
    "--ssf-sans": fontSans,
    "--ssf-wmh": wordmarkMaxHeight,
    "--ssf-ar": String(round(vbW / cutH)),
    minHeight: height,
  } as React.CSSProperties

  const onPointer = (e: React.PointerEvent<HTMLElement>) => {
    const el = rootRef.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    el.style.setProperty("--ssf-px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3))
    el.style.setProperty("--ssf-py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3))
  }
  const onLeave = () => {
    rootRef.current?.style.setProperty("--ssf-px", "0")
    rootRef.current?.style.setProperty("--ssf-py", "0")
  }

  const cols: React.ReactNode[] = []
  if (jobs.length)
    cols.push(
      <div className="ssf-col" key="jobs">
        <h3 className="ssf-tag">{jobsLabel}</h3>
        <ul className="ssf-big">
          {jobs.map((j, i) => (
            <li key={i} className="ssf-line" style={{ "--i": i } as React.CSSProperties}>
              {j.href ? <a {...linkProps(j.href)}>{j.title}</a> : <span>{j.title}</span>}
            </li>
          ))}
        </ul>
      </div>,
    )
  if (address.length)
    cols.push(
      <div className="ssf-col" key="office">
        <h3 className="ssf-tag">{officeLabel}</h3>
        <address className="ssf-big" style={{ fontStyle: "normal" }}>
          {address.map((l, i) => (
            <span key={i} className="ssf-line" style={{ "--i": i } as React.CSSProperties}>
              <span>{l}</span>
            </span>
          ))}
        </address>
        {mapLabel && (
          <a className="ssf-map" {...linkProps(mapHref)}>
            {mapLabel}
            <svg viewBox="0 0 88 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d={SQUIGGLE} data-draw="" />
            </svg>
          </a>
        )}
      </div>,
    )
  if (email || chatHref || socials.length)
    cols.push(
      <div className="ssf-col" key="contact">
        <h3 className="ssf-tag">{contactLabel}</h3>
        <ul className="ssf-big">
          {email && (
            <li className="ssf-line" style={{ "--i": 0 } as React.CSSProperties}>
              <button type="button" className={"ssf-copy" + (copied ? " is-copied" : "")} onClick={copy} title="Copy email address">
                <span className="ssf-addr">{email}</span>
                <span className="ssf-done" aria-hidden="true">
                  {copiedLabel}
                </span>
              </button>
            </li>
          )}
          {chatHref && chatLabel && (
            <li className="ssf-line" style={{ "--i": 1 } as React.CSSProperties}>
              <a {...linkProps(chatHref)}>
                {chatLabel}
                {note && <span className="ssf-ast">*</span>}
              </a>
            </li>
          )}
        </ul>
        {note && <p className="ssf-note">{note}</p>}
        {socials.length > 0 && (
          <ul className="ssf-socials">
            {socials.map((s, i) => (
              <li key={i}>
                <a className="ssf-soc" {...linkProps(s.href)} aria-label={s.label ?? s.kind} style={{ "--i": i } as React.CSSProperties}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {ICONS[s.kind]}
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        )}
        <span className="ssf-sr" role="status">
          {copied ? "Email address copied" : ""}
        </span>
      </div>,
    )

  return (
    <footer ref={rootRef} className={"ssf" + (seen ? " is-in" : "") + (className ? " " + className : "")} style={style} onPointerMove={onPointer} onPointerLeave={onLeave}>
      <style>{CSS}</style>

      <div className="ssf-top">
        {navLabel ? (
          <a className="ssf-nav" {...linkProps(navHref)}>
            <svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
              <path d={starPath(11, 48, 30, 0, 0, 0.3, 7)} fill="currentColor" />
            </svg>
            <span>{navLabel}</span>
          </a>
        ) : (
          <span />
        )}
        <a className="ssf-logo" {...linkProps(homeHref)} aria-label={wordmark + ", home"}>
          <svg viewBox={smallVb} aria-hidden="true" focusable="false">
            <path d={small.main + small.extra.join("")} data-draw="" transform="skewX(-9)" />
          </svg>
        </a>
        {chatHref ? (
          <a className="ssf-chat" {...linkProps(chatHref)} aria-label={chatLabel || "Message us"}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2.6A9.4 9.4 0 0 0 3.9 16.8L2.7 21.3L7.3 20.1A9.4 9.4 0 1 0 12 2.6Z" fill="currentColor" />
              <path d="M8.6 7.6C9.2 7.2 9.7 7.4 10 8L10.6 9.5C10.8 10 10.5 10.4 10.1 10.8C10.8 12.2 11.8 13.2 13.2 13.9C13.6 13.5 14 13.2 14.5 13.4L16 14C16.6 14.3 16.8 14.8 16.4 15.4C15.7 16.4 14.6 16.8 13.4 16.3C10.6 15.2 8.8 13.4 7.7 10.6C7.2 9.4 7.6 8.3 8.6 7.6Z" fill="var(--ssf-paper)" />
            </svg>
          </a>
        ) : (
          <span />
        )}
      </div>

      <div className="ssf-panel">
        {cols.length > 0 && (
          <div className="ssf-cols" style={{ "--ssf-n": cols.length } as React.CSSProperties}>
            {cols.map((c, k) => (
              <React.Fragment key={k}>{React.cloneElement(c as React.ReactElement<{ style?: React.CSSProperties }>, { style: { "--c": k } as React.CSSProperties })}</React.Fragment>
            ))}
          </div>
        )}

        {bottom && <div className="ssf-bottom">{bottom}</div>}
        <div className="ssf-stage">
          <div className="ssf-stage-in" ref={stageRef} style={{ marginBottom: round(-((vbH - cutH) / vbW) * 100) + "%" }}>
            <button type="button" className="ssf-wm-btn" onClick={replay} aria-label={"Write " + wordmark + " again"}>
              <svg key={run} className="ssf-wm" viewBox={[vbX, vbY, vbW, vbH].map(round).join(" ")} aria-hidden="true" focusable="false">
                <g transform={"skewX(-9)"}>
                  <path d={word.main} data-draw="" style={{ "--dur": drawDur + "s", "--at": writeAt + "s" } as React.CSSProperties} />
                  {word.extra.map((d, k) => (
                    <path key={k} d={d} data-draw="" style={{ "--dur": ".28s", "--at": round(writeAt + drawDur + k * 0.16) + "s" } as React.CSSProperties} />
                  ))}
                </g>
              </svg>
            </button>

            {items.map((s) => (
              <div
                key={s.i}
                className="ssf-st"
                style={
                  {
                    left: s.at.x + "%",
                    top: s.at.y + "%",
                    width: "max(" + round(s.size) + "cqw, 46px)",
                    zIndex: 3 + Math.max(0, order.indexOf(s.i) + 1),
                    "--r": s.rotate + "deg",
                    "--d": s.depth,
                    "--at": round(s.delay) + "s",
                  } as React.CSSProperties
                }
              >
                <button
                  type="button"
                  className="ssf-st-btn"
                  aria-label={s.label + ". Drag, or use the arrow keys, to move it. Escape puts it back."}
                  onPointerDown={(e) => onDown(e, s.i)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  onDoubleClick={(e) => goHome(s.i, e.currentTarget)}
                  onKeyDown={(e) => onKey(e, s.i)}
                >
                  <span key={run} className="ssf-st-slap">
                    <span className="ssf-st-lift">{s.node ?? <StickerSvg kind={s.kind} text={s.text} />}</span>
                  </span>
                </button>
                <span key={"r" + run} className="ssf-ring" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>

        {credits.length > 0 && (
          <div className="ssf-credits" ref={popRef}>
            {open && (
              <ul className="ssf-pop">
                {credits.map((c, i) => (
                  <li key={i}>
                    <b>{c.role}</b>
                    <strong>{c.name}</strong>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="ssf-pill" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ "--end": round(endAt) + "s" } as React.CSSProperties}>
              credits
            </button>
          </div>
        )}
      </div>
    </footer>
  )
}
