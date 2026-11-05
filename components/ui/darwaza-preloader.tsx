"use client"

// Darwaza Preloader — a loading gate and scroll entrance in the manner of a
// Jaipur doorway: a stucco wall washed in hot pink, a cusped Mughal arch framed
// in powder blue with raised white plaster acanthus, and a pair of weathered
// rose doors.
//
// Storyboard. While the page loads (scroll is held), the doorway is drawn as
// fine white linework on the wall, frame to doors to relief. Colour then rises
// from the floor behind a soft wet edge and replaces the sketch: blue plaster,
// white mouldings, rose timber, brass; each plaster ornament swells out of the
// wall as the paint reaches it. At 100 the title settles letter by letter along
// the arch and two gold rings drop onto the door plates and swing. Then the
// visitor scrolls: the doors swing inward on warm light, the camera walks
// through the doorway, and the page behind the doors comes forward. Scrolling
// back up closes them again.
//
// One file, React only. Every surface is SVG lit by SVG filters (stucco,
// plaster relief, wood grain), rasterised once into static layers; the load and
// the scroll only move transforms and opacity, so nothing heavy repaints per
// frame. Every rule in the scoped <style> is .dwz- prefixed and nothing is
// fetched.

import * as React from "react"

export interface DarwazaPalette {
  /** The wall wash. */
  wall: string
  /** The painted frame and spandrels. */
  frame: string
  /** Plaster: mouldings and the relief work. */
  plaster: string
  /** The painted doors. */
  door: string
  /** Rings, studs, plates. */
  brass: string
  /** The title, the monogram and the corner type. */
  ink: string
}

export type DarwazaPreset = "gulabi" | "neel" | "haldi"

export interface DarwazaPreloaderProps {
  /** The page behind the doors. It is pinned while the doors open, then scrolls on as normal. */
  children?: React.ReactNode
  /** Real loading progress, 0–100. Leave undefined to simulate over `durationMs`. */
  progress?: number
  /** Length of the simulated load. Defaults to 6400ms. */
  durationMs?: number
  /** How much scrolling opens the doors, in multiples of the gate's height. Defaults to 1.6. */
  scrollDistance?: number
  /** Hold the page's scroll while loading. Defaults to true. */
  lockScroll?: boolean
  /** Wall, frame and doors. Defaults to "gulabi" (Jaipur pink and blue). */
  preset?: DarwazaPreset
  /** Colour overrides, merged over the preset. */
  palette?: { wall?: string; frame?: string; plaster?: string; door?: string; brass?: string; ink?: string }
  /** The line that arches over the doors. Defaults to "Pesh Karte Hain". */
  title?: string
  /** The mark above the doorway. "etc" draws the built-in ligature; anything else is set in type. */
  monogram?: string
  /** Replaces the monogram with your own node, centred above the doorway. */
  logo?: React.ReactNode
  /** Top-left line. */
  meta?: string
  /** The prompt shown once the doors are ready. Empty string hides it. */
  cue?: string
  /** The line behind the doors when there are no children. */
  message?: string
  /** Corner type, the counter and the cue. Defaults to true. */
  hud?: boolean
  /** Accessible name of the gate. */
  label?: string
  /** Face for the arched title. */
  displayFamily?: string
  /** Weight for the arched title. Defaults to 700; use 400 for single-weight display faces such as Rye. */
  displayWeight?: number
  /** Face for the monogram when it is set in type, and the line behind the doors. */
  serifFamily?: string
  /** Face for the corner type. */
  monoFamily?: string
  /** Height of the gate. A definite length, never a percentage. */
  height?: string
  /** Fired once, when the load reaches 100 and the doors are ready. */
  onReady?: () => void
  /** Fired once, the first time the doors are fully open. */
  onComplete?: () => void
  className?: string
}

const PRESETS: { [K in DarwazaPreset]: DarwazaPalette } = {
  gulabi: {
    wall: "#e0226d", frame: "#8db3dc", plaster: "#f7f3ec", door: "#eba9b4", brass: "#c9a15a", ink: "#ffffff",
  },
  neel: {
    wall: "#1f2a66", frame: "#7cc4be", plaster: "#f6f0e2", door: "#dcaa52", brass: "#f0d58a", ink: "#f8f2e4",
  },
  haldi: {
    wall: "#eeb02c", frame: "#2f6f55", plaster: "#fbf6e8", door: "#da5677", brass: "#a7742a", ink: "#fffaf0",
  },
}

const DISPLAY_STACK = '"Playfair Display", "Bodoni Moda", Didot, "Bodoni 72", "Libre Caslon Display", Georgia, "Bitstream Charter", serif'
const SERIF_STACK = '"Bodoni Moda", Didot, "Bodoni 72", "Playfair Display", "Iowan Old Style", Georgia, serif'
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

// After 100: the rings drop, the title settles, the cue appears.
const CUE_MS = 1500

// #region geometry
// Pure helpers and the stage layout, lifted out and executed by tests/darwaza-preloader.test.mjs.

/** The stage is a 1000 × 1200 drawing, fitted into the root. */
const SW = 1000
const SH = 1200
/** The opening: x 212–788, springing at 637, the apex cusp at 381, down to the floor. */
const OX0 = 212
const OX1 = 788
const OYS = 637
const OYA = 381
const OYB = 1200
const LOBES = 8
/** Width of the white arch moulding around the opening. */
const MOULD = 20
/** The rings hang here, either side of the meeting stile. */
const RING_Y = 668
const RING_DX = 88
/** Soft height of the wet edge, in stage px. */
const FEATHER = 46
/** The title follows this ellipse. */
const TITLE_CX = 500
const TITLE_CY = 692
const TITLE_RX = 248
const TITLE_RY = 172
/** Light comes from the top left (SVG azimuth, degrees clockwise from +x). */
const LIGHT = 225

/** The simulated load at time fraction t ∈ [0, 1]: eased, with stalls, monotonic, 0 → 100. */
export function dwzSimulated(t: number) {
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
  const stall = 0.035 * Math.sin(k * Math.PI * 3) * Math.sin(k * Math.PI)
  return Math.max(0, Math.min(100, (ease - stall) * 100))
}

/** Two decimals, no trailing noise. */
export function dwzN(v: number) {
  return String(Math.round(v * 100) / 100)
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => {
  const k = clamp01(v)
  return k * k * (3 - 2 * k)
}

/** A polyline (or polygon) through points. */
export function dwzPoly(pts: number[][], close: boolean) {
  let d = ""
  for (let i = 0; i < pts.length; i++) d += (i ? " L" : "M") + dwzN(pts[i][0]) + " " + dwzN(pts[i][1])
  return close ? d + " Z" : d
}

/** Points on the half-ellipse envelope of an arch, from the left springing over the top to the right. */
export function dwzEnvelope(x0: number, x1: number, ys: number, ya: number, n: number) {
  const cx = (x0 + x1) / 2
  const a = (x1 - x0) / 2
  const b = ys - ya
  const pts: number[][] = []
  for (let i = 0; i <= n; i++) {
    const th = Math.PI - (Math.PI * i) / n
    pts.push([cx + a * Math.cos(th), ys - b * Math.sin(th)])
  }
  return pts
}

/**
 * A cusped (multifoil) arch: from the floor up the left jamb, over `lobes`
 * outward-bulging foils to the right jamb and back down. With an even number
 * of lobes the apex is a cusp, as on a Mughal arch.
 */
export function dwzArch(x0: number, x1: number, ys: number, ya: number, yb: number, lobes: number) {
  const pts = dwzEnvelope(x0, x1, ys, ya, lobes)
  let d = "M" + dwzN(x0) + " " + dwzN(yb) + " L" + dwzN(pts[0][0]) + " " + dwzN(pts[0][1])
  for (let i = 1; i <= lobes; i++) {
    const p = pts[i - 1]
    const q = pts[i]
    const r = Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.7
    d += " A" + dwzN(r) + " " + dwzN(r) + " 0 0 0 " + dwzN(q[0]) + " " + dwzN(q[1])
  }
  return d + " L" + dwzN(x1) + " " + dwzN(yb) + " Z"
}

/** The opening, grown outward by `pad` on the jambs and the apex. */
export function dwzOpening(pad: number) {
  return dwzArch(OX0 - pad, OX1 + pad, OYS, OYA - pad, OYB + 2, LOBES)
}

/** Where the load is: the sketch draws over 0–62, the colour rises over 38–94. */
export function dwzWash(pct: number) {
  const p = Math.max(0, Math.min(100, pct))
  return { sketch: clamp01(p / 62), wash: smooth((p - 38) / 56) }
}

/** The paint layer's offset for a wash of 0–1: fully below the floor at 0, home at 1. */
export function dwzEdge(wash: number) {
  return (SH + FEATHER) * (1 - clamp01(wash))
}

/**
 * How to fit the stage into a root of w × h: the doors stand on the floor and the doorway fills the
 * height; on narrow screens the outer frame bands may run off the sides, the arch never does.
 */
export function dwzFit(w: number, h: number) {
  const k = Math.max(0.05, Math.min(w / 680, h / SH))
  return { k, ox: (w - SW * k) / 2, oy: h - SH * k }
}

/**
 * The scroll entrance at s ∈ [0, 1]: the title lifts away, the doors swing to 104°, light spills,
 * the camera walks through (0 → 1 of the zoom) and the gate fades at the very end.
 */
export function dwzScrub(s: number) {
  const p = clamp01(s)
  const io = (v: number) => {
    const k = clamp01(v)
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
  }
  const zin = clamp01((p - 0.3) / 0.7)
  return {
    title: 1 - smooth(p / 0.18),
    cue: 1 - clamp01(p / 0.06),
    door: 104 * io((p - 0.03) / 0.6),
    light: smooth((p - 0.06) / 0.32),
    walk: zin * zin * zin * 0.35 + io(zin) * 0.65,
    fade: 1 - smooth((p - 0.84) / 0.16),
  }
}

/** The zoom that carries the opening past every edge of a root of w × h. */
export function dwzZoom(w: number, h: number, k: number) {
  return Math.max(w / ((OX1 - OX0) * k), h / ((OYB - OYA) * k)) * 1.15
}

/** A cubic Bézier chain from `start` through segments [c1x, c1y, c2x, c2y, x, y], sampled. */
export function dwzChain(start: number[], segs: number[][], per: number) {
  const pts: number[][] = [start]
  let p = start
  for (const s of segs) {
    for (let i = 1; i <= per; i++) {
      const t = i / per
      const u = 1 - t
      pts.push([
        u * u * u * p[0] + 3 * u * u * t * s[0] + 3 * u * t * t * s[2] + t * t * t * s[4],
        u * u * u * p[1] + 3 * u * u * t * s[1] + 3 * u * t * t * s[3] + t * t * t * s[5],
      ])
    }
    p = [s[4], s[5]]
  }
  return pts
}

/** A spiral: from radius r0 at angle a0 (degrees) to r1 over `turns` (negative turns wind the other way). */
export function dwzSpiral(cx: number, cy: number, r0: number, r1: number, a0: number, turns: number, n: number) {
  const pts: number[][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = ((a0 + turns * 360 * t) * Math.PI) / 180
    const r = r0 + (r1 - r0) * t
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return pts
}

/** A filled ribbon along a polyline, tapering from width w0 to w1. */
export function dwzRibbon(pts: number[][], w0: number, w1: number) {
  const n = pts.length
  const left: number[][] = []
  const right: number[][] = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const len = Math.hypot(tx, ty) || 1
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2
    left.push([pts[i][0] - (ty / len) * w, pts[i][1] + (tx / len) * w])
    right.push([pts[i][0] + (ty / len) * w, pts[i][1] - (tx / len) * w])
  }
  return dwzPoly(left.concat(right.reverse()), true)
}

/** A palmate acanthus leaf: five serrated lobes, base at the origin, pointing up, radius R. */
export function dwzPalmate(R: number) {
  const lobes = [[-80, 0.6], [-41, 0.86], [0, 1], [41, 0.86], [80, 0.6]]
  const at = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [Math.cos(a) * r, Math.sin(a) * r]
  }
  const pts: number[][] = [[-R * 0.07, R * 0.12]]
  for (let i = 0; i < lobes.length; i++) {
    const d = lobes[i][0]
    const L = R * lobes[i][1]
    pts.push(at(d - 18, L * 0.46), at(d - 15, L * 0.76), at(d - 8, L * 0.7), at(d - 3, L * 0.93), at(d, L), at(d + 3, L * 0.93), at(d + 8, L * 0.7), at(d + 15, L * 0.76))
    if (i < lobes.length - 1) pts.push(at(d + 18, L * 0.46), at((d + lobes[i + 1][0]) / 2, R * 0.3))
  }
  pts.push(at(96, R * 0.24), [R * 0.07, R * 0.12])
  return dwzPoly(pts, true)
}

/** The veins of a palmate leaf: one groove from the base to each lobe. */
export function dwzPalmateVeins(R: number) {
  let d = ""
  for (const [deg, l] of [[-80, 0.6], [-41, 0.86], [0, 1], [41, 0.86], [80, 0.6]]) {
    const a = ((deg - 90) * Math.PI) / 180
    d += "M0 " + dwzN(R * 0.06) + " L" + dwzN(Math.cos(a) * R * l * 0.78) + " " + dwzN(Math.sin(a) * R * l * 0.78) + " "
  }
  return d.trim()
}

/** A feathered acanthus sprig: a curving midrib with `n` pointed lobes a side, base at the origin, pointing up. */
export function dwzFeather(len: number, w: number, n: number, curl: number) {
  const mid = (t: number) => [curl * len * t * t, -len * t]
  const nrm = (t: number) => {
    const tx = 2 * curl * len * t
    const ty = -len
    const l = Math.hypot(tx, ty)
    return [-ty / l, tx / l]
  }
  const env = (t: number) => w * Math.pow(Math.sin(Math.PI * Math.min(1, t)), 0.7) * (1 - 0.25 * t)
  const side = (s: number) => {
    const pts: number[][] = []
    for (let k = 0; k < n; k++) {
      const t0 = 0.08 + (k / n) * 0.84
      const t1 = t0 + 0.84 / n
      const a = mid(t0)
      const an = nrm(t0)
      const b = mid(t1 - 0.02)
      const bn = nrm(t1)
      pts.push([a[0] + an[0] * s * env(t0) * 0.38, a[1] + an[1] * s * env(t0) * 0.38])
      pts.push([b[0] + bn[0] * s * env(t1) + (b[0] - a[0]) * 0.25, b[1] + bn[1] * s * env(t1) + (b[1] - a[1]) * 0.25])
    }
    return pts
  }
  const tip = mid(1.04)
  const pts = [[w * 0.14, 0]].concat(side(1), [tip], side(-1).reverse(), [[-w * 0.14, 0]])
  return dwzPoly(pts, true)
}

/** Lay letters of the given advance widths along the top of an ellipse, centred: a position and an angle each. */
export function dwzArcLayout(widths: number[], cx: number, cy: number, rx: number, ry: number) {
  const N = 720
  const pts: number[][] = []
  const cum: number[] = [0]
  for (let i = 0; i <= N; i++) {
    const t = Math.PI - (Math.PI * i) / N
    pts.push([cx + rx * Math.cos(t), cy - ry * Math.sin(t)])
    if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  const total = cum[N]
  let sum = 0
  for (const w of widths) sum += w
  let s = (total - sum) / 2
  let j = 0
  const out: number[][] = []
  for (const w of widths) {
    const at = Math.max(0, Math.min(total, s + w / 2))
    while (j < N - 1 && cum[j + 1] < at) j++
    const f = (at - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j])
    const a = pts[j]
    const b = pts[j + 1]
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI])
    s += w
  }
  return { places: out, total, used: sum }
}

/** Title size on the arch: 40 for up to 14 letters, smaller so a longer line still fits the curve. */
export function dwzTitleSize(len: number) {
  return Math.max(22, Math.min(40, 571 / Math.max(1, len)))
}

/** Hex colour → [r, g, b], or the fallback for anything else. */
export function dwzHex(c: string, fallback: number[]) {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return fallback
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Mix a hex colour toward black (amt < 0) or white (amt > 0), amt ∈ [-1, 1]. */
export function dwzShade(c: string, amt: number) {
  const [r, g, b] = dwzHex(c, [128, 128, 128])
  const t = amt < 0 ? 0 : 255
  const f = Math.abs(amt)
  const mix = (v: number) => Math.round(v + (t - v) * f)
  return "rgb(" + mix(r) + "," + mix(g) + "," + mix(b) + ")"
}
// #endregion

const DWZ_CSS = `
.dwz-root { position: relative; overflow-x: clip; color: var(--dwz-ink); -webkit-font-smoothing: antialiased; }
.dwz-pin { position: relative; }
.dwz-gatewrap { position: sticky; top: 0; z-index: 2; overflow: hidden; pointer-events: none; }
.dwz-content { position: sticky; top: 0; z-index: 1; }
.dwz-behind { position: relative; display: grid; place-items: center; text-align: center; overflow: hidden; background: var(--color-background, #fbf6ef); color: var(--color-foreground, #22161a); }
.dwz-behind-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 55% 50% at 50% 46%, rgba(255,232,214,.75), transparent 72%); }
.dwz-behind p { position: relative; margin: 0; font-family: var(--dwz-serif); font-style: italic; font-size: clamp(30px, 5vw, 64px); line-height: 1.05; letter-spacing: .01em; }
.dwz-behind small { position: relative; display: block; margin-top: 16px; font-family: var(--dwz-mono); font-size: 10px; letter-spacing: .26em; text-transform: uppercase; opacity: .5; }
.dwz-gate { position: absolute; inset: 0; outline: none; cursor: pointer; pointer-events: auto; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; background: var(--dwz-wall); }
.dwz-gate[data-open="true"] { background: transparent; }
.dwz-gate[data-gone="true"] { visibility: hidden; pointer-events: none; }
.dwz-gate:focus-visible::after { content: ""; position: absolute; inset: 0; box-shadow: inset 0 0 0 3px rgba(255,255,255,.6); pointer-events: none; z-index: 5; }
.dwz-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.dwz-scene { position: absolute; inset: 0; transform-origin: var(--dwz-ox) var(--dwz-oy); will-change: transform; }
.dwz-wall { position: absolute; inset: 0; display: block; width: 100%; height: 100%; max-width: none; }
.dwz-stage { position: absolute; left: 0; top: 0; width: 1000px; height: 1200px; transform-origin: 0 0; }
.dwz-svg { position: absolute; display: block; max-width: none; overflow: visible; }
.dwz-full { left: 0; top: 0; width: 1000px; height: 1200px; }
.dwz-wipe { position: absolute; left: 0; top: 0; width: 1000px; height: 1200px; overflow: hidden; will-change: transform; }
.dwz-wipe-in { position: absolute; left: 0; top: 0; width: 1000px; height: 1200px; will-change: transform; }
.dwz-paint { -webkit-mask-image: linear-gradient(to bottom, transparent 0px, #000 46px); mask-image: linear-gradient(to bottom, transparent 0px, #000 46px); }
.dwz-sketch { -webkit-mask-image: linear-gradient(to top, transparent 0px, #000 46px); mask-image: linear-gradient(to top, transparent 0px, #000 46px); }
.dwz-sketch path { fill: none; stroke: rgba(255,255,255,.9); stroke-width: 1.6; stroke-dasharray: 1 1; stroke-dashoffset: 1; stroke-linejoin: round; }
.dwz-sheen { position: absolute; left: 0; right: 0; top: 14px; height: 64px; pointer-events: none; background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,.55) 38%, rgba(70,10,40,.22) 62%, rgba(70,10,40,0)); mix-blend-mode: soft-light; }
.dwz-doors { position: absolute; left: 212px; top: 381px; width: 576px; height: 819px; perspective: 1500px; perspective-origin: 50% 38%; }
.dwz-light { position: absolute; inset: 0; opacity: 0; background: radial-gradient(ellipse 36% 54% at 50% 54%, rgba(255,246,228,.8), rgba(255,228,208,.5) 45%, rgba(255,214,196,.16) 75%, rgba(255,214,196,0)); }
.dwz-leaf { position: absolute; top: 0; width: 288px; height: 819px; transform: rotateY(0deg); will-change: transform; }
.dwz-leaf-l { left: 0; transform-origin: 0 50%; }
.dwz-leaf-r { left: 288px; transform-origin: 100% 50%; }
.dwz-shade { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
.dwz-leaf-l .dwz-shade { background: linear-gradient(to right, rgba(60,14,34,.05), rgba(60,14,34,.62)); }
.dwz-leaf-r .dwz-shade { background: linear-gradient(to left, rgba(60,14,34,.05), rgba(60,14,34,.62)); }
.dwz-dring { position: absolute; width: 48px; height: 48px; opacity: 0; transform-origin: 24px 4px; }
.dwz-gate[data-phase="ready"] .dwz-dring { animation: dwz-ring 1900ms cubic-bezier(.3,.7,.3,1) both; }
.dwz-rel { position: absolute; opacity: 0; transform: translateY(10px) scale(.78); transition: transform 1300ms cubic-bezier(.18,.9,.24,1.12), opacity 700ms ease; will-change: transform; }
.dwz-rel[data-on="1"] { opacity: 1; transform: none; }
.dwz-rel svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; max-width: none; overflow: visible; }
.dwz-letter { position: absolute; width: 0; height: 0; }
.dwz-letter-i { position: absolute; left: 0; bottom: -.22em; white-space: pre; line-height: 1; font-family: var(--dwz-display); font-weight: var(--dwz-weight); letter-spacing: .01em; color: var(--dwz-ink); text-shadow: 0 2px 3px rgba(70,8,32,.34), 0 0 1px rgba(70,8,32,.25); transform: translate(-50%, 18px); opacity: 0; filter: blur(6px); }
.dwz-gate[data-phase="ready"] .dwz-letter-i { animation: dwz-letter 950ms cubic-bezier(.2,.75,.2,1) both; }
.dwz-title { will-change: transform, opacity; }
.dwz-logo { position: absolute; display: grid; place-items: center; animation: dwz-logo 1500ms cubic-bezier(.2,.7,.2,1) 150ms both; }
.dwz-logo-t { font-family: var(--dwz-serif); font-style: italic; color: var(--dwz-ink); line-height: 1; letter-spacing: -.02em; white-space: nowrap; }
.dwz-hud { position: absolute; z-index: 3; font-family: var(--dwz-mono); font-size: 10px; letter-spacing: .26em; text-transform: uppercase; color: var(--dwz-ink); opacity: .82; transition: opacity 500ms ease; pointer-events: none; }
.dwz-tl { left: clamp(18px, 3vw, 40px); top: clamp(18px, 3vw, 34px); }
.dwz-br { right: clamp(18px, 3vw, 40px); bottom: clamp(16px, 3vw, 28px); display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.dwz-count { font-size: 13px; letter-spacing: .16em; font-variant-numeric: tabular-nums; }
.dwz-gate[data-phase="ready"] .dwz-br { opacity: 0; }
.dwz-cue { position: absolute; left: 50%; bottom: clamp(18px, 4vh, 40px); z-index: 3; transform: translateX(-50%); font-family: var(--dwz-mono); font-size: 10px; letter-spacing: .3em; text-transform: uppercase; color: var(--dwz-ink); text-shadow: 0 1px 2px rgba(60,6,30,.4); pointer-events: none; white-space: nowrap; }
.dwz-cue-in { opacity: 0; transform: translateY(8px); transition: opacity 700ms ease, transform 900ms cubic-bezier(.2,.7,.2,1); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.dwz-gate[data-cue="true"] .dwz-cue-in { opacity: 1; transform: none; }
.dwz-cue-line { position: relative; width: 1px; height: 34px; overflow: hidden; background: rgba(255,255,255,.28); }
.dwz-cue-line::after { content: ""; position: absolute; left: 0; top: 0; width: 1px; height: 14px; background: var(--dwz-ink); animation: dwz-drip 1800ms cubic-bezier(.6,0,.3,1) infinite; }
.dwz-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@keyframes dwz-logo { from { opacity: 0; transform: translateY(16px); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0px); } }
@keyframes dwz-letter { from { opacity: 0; transform: translate(-50%, 18px); filter: blur(6px); } to { opacity: 1; transform: translate(-50%, 0px); filter: blur(0px); } }
@keyframes dwz-ring {
  0% { opacity: 0; transform: translateY(-46px) rotate(0deg); }
  18% { opacity: 1; }
  34% { transform: translateY(0px) rotate(0deg); }
  46% { transform: translateY(0px) rotate(14deg); }
  60% { transform: translateY(0px) rotate(-8deg); }
  73% { transform: translateY(0px) rotate(4deg); }
  86% { transform: translateY(0px) rotate(-1.5deg); }
  100% { opacity: 1; transform: translateY(0px) rotate(0deg); }
}
@keyframes dwz-drip { 0% { transform: translateY(-14px); } 100% { transform: translateY(34px); } }
@media (prefers-reduced-motion: reduce) {
  .dwz-sheen { display: none; }
  .dwz-logo { animation: none; }
  .dwz-rel { transition: opacity 400ms ease; transform: none; }
  .dwz-gate[data-phase="ready"] .dwz-letter-i { animation: none; opacity: 1; transform: translate(-50%, 0px); filter: none; }
  .dwz-gate[data-phase="ready"] .dwz-dring { animation: none; opacity: 1; }
  .dwz-cue-line::after { animation: none; }
}
`

// ---- static art ----

type Pal = DarwazaPalette

/** A raised-plaster filter: rounded by a blurred height map, lit from the top left, casting a soft shadow. */
function Emboss({ id, blur, scale, shadow, opacity, dx, dy, sblur, az, spec }: {
  id: string; blur: number; scale: number; shadow: string; opacity: number; dx: number; dy: number; sblur: number; az: number; spec: number
}) {
  const elev = 54
  const kd = dwzN(1 / Math.sin((elev * Math.PI) / 180))
  return (
    <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={blur} result="b" />
      <feDiffuseLighting in="b" surfaceScale={scale} diffuseConstant={kd} lightingColor="#ffffff" result="d">
        <feDistantLight azimuth={az} elevation={elev} />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="lit" />
      <feSpecularLighting in="b" surfaceScale={scale} specularConstant={spec} specularExponent="18" lightingColor="#ffffff" result="s">
        <feDistantLight azimuth={az} elevation={elev} />
      </feSpecularLighting>
      <feComposite in="s" in2="SourceAlpha" operator="in" result="s2" />
      <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="l2" />
      <feComposite in="l2" in2="SourceAlpha" operator="in" result="shape" />
      <feGaussianBlur in="SourceAlpha" stdDeviation={sblur} result="sb" />
      <feOffset in="sb" dx={dx} dy={dy} result="so" />
      <feFlood floodColor={shadow} floodOpacity={opacity} />
      <feComposite in2="so" operator="in" result="sh" />
      <feMerge>
        <feMergeNode in="sh" />
        <feMergeNode in="shape" />
      </feMerge>
    </filter>
  )
}

/** Shared filters: stucco, plaster, wood. */
function Filters({ id, pal }: { id: string; pal: Pal }) {
  const navy = dwzShade(pal.frame, -0.62)
  const plum = dwzShade(pal.door, -0.62)
  return (
    <defs>
      <filter id={id + "stucco"} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="4" result="n" />
        <feDiffuseLighting in="n" surfaceScale="0.75" diffuseConstant="1.14" lightingColor="#ffffff" result="l">
          <feDistantLight azimuth={LIGHT} elevation="61" />
        </feDiffuseLighting>
        <feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves="2" seed="9" result="m" />
        <feDiffuseLighting in="m" surfaceScale="5" diffuseConstant="1.1" lightingColor="#ffffff" result="ml">
          <feDistantLight azimuth={LIGHT} elevation="66" />
        </feDiffuseLighting>
        <feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="a" />
        <feComposite in="a" in2="ml" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
      </filter>
      <filter id={id + "tex"} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="2" result="n" />
        <feDiffuseLighting in="n" surfaceScale="0.6" diffuseConstant="1.13" lightingColor="#ffffff" result="l">
          <feDistantLight azimuth={LIGHT} elevation="62" />
        </feDiffuseLighting>
        <feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="a" />
        <feComposite in="a" in2="SourceAlpha" operator="in" />
      </filter>
      <filter id={id + "drop"} x="-10%" y="-10%" width="125%" height="125%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="9" />
        <feOffset dx="8" dy="11" result="o" />
        <feFlood floodColor={dwzShade(pal.wall, -0.7)} floodOpacity=".42" />
        <feComposite in2="o" operator="in" result="s" />
        <feMerge>
          <feMergeNode in="s" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={id + "wood"} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.07 0.0035" numOctaves="3" seed="11" result="g" />
        <feDiffuseLighting in="g" surfaceScale="0.85" diffuseConstant="1.12" lightingColor="#ffffff" result="gl">
          <feDistantLight azimuth={LIGHT} elevation="66" />
        </feDiffuseLighting>
        <feComposite in="SourceGraphic" in2="gl" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="a" />
        <feTurbulence type="fractalNoise" baseFrequency="0.016 0.045" numOctaves="4" seed="5" result="p" />
        <feColorMatrix in="p" type="matrix" values={"0 0 0 0 1  0 0 0 0 0.93  0 0 0 0 0.9  1.5 0 0 0 -0.9"} result="pw" />
        <feComposite in="pw" in2="SourceAlpha" operator="in" result="worn" />
        <feMerge>
          <feMergeNode in="a" />
          <feMergeNode in="worn" />
        </feMerge>
      </filter>
      <Emboss id={id + "plaster"} blur={2.6} scale={4.2} shadow={navy} opacity={0.42} dx={3.2} dy={4.2} sblur={3} az={LIGHT} spec={0.5} />
      <Emboss id={id + "fine"} blur={1.4} scale={2.6} shadow={navy} opacity={0.34} dx={1.6} dy={2.2} sblur={1.6} az={LIGHT} spec={0.35} />
      <Emboss id={id + "mould"} blur={2.6} scale={3.4} shadow={plum} opacity={0.36} dx={2.6} dy={3.4} sblur={2.6} az={LIGHT} spec={0.22} />
      <radialGradient id={id + "stud"} cx="0.36" cy="0.32" r="0.7">
        <stop offset="0" stopColor={dwzShade(pal.brass, 0.62)} />
        <stop offset="0.45" stopColor={pal.brass} />
        <stop offset="1" stopColor={dwzShade(pal.brass, -0.5)} />
      </radialGradient>
      <linearGradient id={id + "gold"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={dwzShade(pal.brass, 0.55)} />
        <stop offset="0.45" stopColor={pal.brass} />
        <stop offset="0.75" stopColor={dwzShade(pal.brass, -0.35)} />
        <stop offset="1" stopColor={dwzShade(pal.brass, 0.25)} />
      </linearGradient>
      <radialGradient id={id + "vig"} cx="0.5" cy="0.62" r="0.78">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="0.5" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
      </radialGradient>
      <clipPath id={id + "hole"}>
        <path d={dwzOpening(0)} />
      </clipPath>
    </defs>
  )
}

// The frame bands, as offsets inward from the outer edge (x 80 / y 150): a light lip, a raised white
// moulding, a blue band, a fine white line, then the blue field that carries the relief.
const band = (o: number, i: number) =>
  "M" + (80 + o) + " 1202 V" + (150 + o) + " H" + (920 - o) + " V1202 Z M" + (80 + i) + " 1202 V" + (150 + i) + " H" + (920 - i) + " V1202 Z"

function Frame({ id, pal }: { id: string; pal: Pal }) {
  const hole = dwzOpening(0)
  const lip = dwzShade(pal.frame, 0.32)
  return (
    <g>
      <g filter={"url(#" + id + "drop)"}>
        <path d={"M80 1202 V150 H920 V1202 Z " + hole} fill={pal.frame} fillRule="evenodd" />
      </g>
      <g filter={"url(#" + id + "tex)"}>
        <path d={"M80 1202 V150 H920 V1202 Z " + hole} fill={pal.frame} fillRule="evenodd" />
        <path d={band(0, 13)} fill={lip} fillRule="evenodd" filter={"url(#" + id + "fine)"} />
        <path d={band(19, 47)} fill={pal.plaster} fillRule="evenodd" filter={"url(#" + id + "plaster)"} />
        <path d={band(91, 100)} fill={pal.plaster} fillRule="evenodd" filter={"url(#" + id + "fine)"} />
        <path d={dwzOpening(MOULD) + " " + hole} fill={pal.plaster} fillRule="evenodd" filter={"url(#" + id + "plaster)"} />
      </g>
    </g>
  )
}

// ---- relief: palmate leaves on curling stems, sprigs and springing volutes ----

/** One ornament group: where it sits on the stage, where it swells from, when the paint reaches it. */
interface ReliefGroup {
  k: string
  box: number[]
  origin: number[]
  ty: number
  parts: { d: string; t?: string; vein?: string; stroke?: number }[]
}

function buildRelief() {
  const pal = (R: number, x: number, y: number, rot: number, sy: number) => ({
    d: dwzPalmate(R),
    vein: dwzPalmateVeins(R),
    t: "translate(" + x + " " + y + ") rotate(" + rot + ") scale(1 " + sy + ")",
  })
  const fea = (len: number, w: number, n: number, curl: number, x: number, y: number, rot: number) => ({
    d: dwzFeather(len, w, n, curl),
    vein: "M0 0 Q" + dwzN(curl * len * 0.3) + " " + dwzN(-len * 0.5) + " " + dwzN(curl * len * 0.85) + " " + dwzN(-len * 0.9),
    t: "translate(" + x + " " + y + ") rotate(" + rot + ")",
  })
  const stem = dwzChain(
    [494, 356],
    [
      [470, 369, 438, 373, 408, 366],
      [374, 359, 348, 346, 336, 322],
      [324, 298, 316, 270, 288, 266],
      [258, 262, 236, 288, 240, 314],
      [243, 334, 264, 338, 268, 321],
    ],
    14,
  )
  // A sprig stem off the main stem, and a short one growing out of the arch moulding.
  const sprig = dwzChain([352, 352], [[352, 336, 350, 318, 342, 304]], 8)
  const low = dwzChain([262, 448], [[252, 440, 244, 430, 240, 418]], 8)
  const low2 = dwzChain([214, 520], [[206, 512, 200, 500, 199, 488]], 8)
  const vol = dwzChain([200, 598], [[199, 616, 188, 630, 177, 641]], 10).concat(dwzSpiral(186, 652, 14, 3.5, 230.2, -1.15, 40).slice(1))
  const left: ReliefGroup[] = [
    {
      k: "scroll",
      box: [180, 236, 330, 160],
      origin: [470, 360],
      ty: 330,
      parts: [
        { d: dwzRibbon(stem, 12, 4.4) },
        pal(48, 238, 318, 204, 1.05),
        fea(34, 11, 3, 0.25, 280, 266, -62),
        { d: dwzRibbon(sprig, 6.5, 3) },
        fea(70, 22, 4, -0.18, 342, 306, -14),
      ],
    },
    {
      k: "sprig",
      box: [176, 380, 110, 150],
      origin: [255, 470],
      ty: 470,
      parts: [{ d: dwzRibbon(low, 6, 3) }, fea(44, 15, 3, -0.2, 240, 420, -40), { d: dwzRibbon(low2, 5.5, 2.6) }, fea(38, 13, 3, -0.2, 199, 490, -22)],
    },
    { k: "volute", box: [160, 572, 56, 100], origin: [190, 620], ty: 640, parts: [{ d: dwzRibbon(vol, 10, 3.2) }, fea(26, 9, 2, 0.12, 199, 598, -10)] },
  ]
  const groups: ReliefGroup[] = [
    {
      k: "crest",
      box: [416, 252, 168, 122],
      origin: [500, 360],
      ty: 330,
      parts: [
        pal(64, 500, 358, 0, 1.1),
        fea(46, 15, 3, 0.2, 486, 356, -74),
        fea(46, 15, 3, -0.2, 514, 356, 74),
        { d: "M496 352 H504 V366 H496 Z" },
      ],
    },
  ]
  for (const g of left) {
    groups.push({ ...g, k: g.k + "-l" })
    groups.push({ ...g, k: g.k + "-r", box: [SW - g.box[0] - g.box[2], g.box[1], g.box[2], g.box[3]], origin: [SW - g.origin[0], g.origin[1]], parts: g.parts.map((p) => ({ ...p, t: "translate(1000 0) scale(-1 1) " + (p.t || "") })) })
  }
  return groups
}

const RELIEF = buildRelief()

function Relief({ id, pal }: { id: string; pal: Pal }) {
  const groove = dwzShade(pal.frame, -0.35)
  return (
    <>
      {RELIEF.map((g) => {
        const [x, y, w, h] = g.box
        return (
          <div
            key={g.k}
            className="dwz-rel"
            data-ry={g.ty}
            style={{ left: x, top: y, width: w, height: h, transformOrigin: g.origin[0] - x + "px " + (g.origin[1] - y) + "px" }}
          >
            <svg viewBox={x + " " + y + " " + w + " " + h} aria-hidden="true">
              <g filter={"url(#" + id + "plaster)"}>
                {g.parts.map((p, i) => (
                  <g key={i} transform={p.t}>
                    <path d={p.d} fill={pal.plaster} />
                    {p.vein ? <path d={p.vein} fill="none" stroke={groove} strokeOpacity={0.4} strokeWidth={1.6} strokeLinecap="round" /> : null}
                  </g>
                ))}
              </g>
            </svg>
          </div>
        )
      })}
    </>
  )
}

// ---- doors ----

const ECHO_OUT = dwzArch(OX0 + 30, OX1 - 30, OYS + 8, OYA + 30, OYB + 40, LOBES)
const ECHO_IN = dwzArch(OX0 + 44, OX1 - 44, OYS + 8, OYA + 44, OYB + 40, LOBES)
const RAILS = [702, 906, 1108]

/** One leaf, drawn in stage coordinates and cropped to its half of the opening. `side` -1 is the left leaf. */
function Leaf({ id, pal, side }: { id: string; pal: Pal; side: number }) {
  const x0 = side < 0 ? OX0 : 500
  const x1 = side < 0 ? 500 : OX1
  const stileX = side < 0 ? OX0 : OX1 - 18
  const batX = side < 0 ? 486 : 500
  const innerX0 = side < 0 ? OX0 + 18 : 514
  const innerX1 = side < 0 ? 486 : OX1 - 18
  const plateX = 500 + side * RING_DX
  const seam = dwzShade(pal.door, -0.3)
  const hi = dwzShade(pal.door, 0.28)
  const raised = dwzShade(pal.door, 0.03)
  const iron = dwzShade(pal.door, -0.42)
  const studs: number[][] = []
  for (const ry of RAILS) for (let x = innerX0 + 18; x < innerX1 - 6; x += 31) studs.push([x, ry + 9])
  for (let y = 430; y < 1196; y += 38) studs.push([batX + 7, y])
  for (let y = 660; y < 1196; y += 46) studs.push([stileX + 9, y])
  const panels = [
    [innerX0 + 16, RAILS[0] + 30, innerX1 - innerX0 - 32, RAILS[1] - RAILS[0] - 46],
    [innerX0 + 16, RAILS[1] + 30, innerX1 - innerX0 - 32, RAILS[2] - RAILS[1] - 46],
  ]
  const strapX = side < 0 ? OX0 + 4 : OX1 - 4
  const strap = (y: number) => {
    const s = -side
    const end = strapX + s * 132
    return (
      "M" + strapX + " " + (y - 7) + " H" + (end - s * 16) + " C" + (end - s * 8) + " " + (y - 7) + " " + (end - s * 4) + " " + (y - 13) + " " + end + " " + (y - 13) +
      " C" + (end + s * 2) + " " + (y - 4) + " " + (end + s * 2) + " " + (y + 4) + " " + end + " " + (y + 13) +
      " C" + (end - s * 4) + " " + (y + 13) + " " + (end - s * 8) + " " + (y + 7) + " " + (end - s * 16) + " " + (y + 7) + " H" + strapX + " Z"
    )
  }
  return (
    <svg className="dwz-svg" viewBox={x0 + " " + OYA + " " + (x1 - x0) + " " + (OYB - OYA)} preserveAspectRatio="none" style={{ left: 0, top: 0, width: x1 - x0, height: OYB - OYA }} aria-hidden="true">
      <rect x={x0} y={OYA} width={x1 - x0} height={OYB - OYA} fill={pal.door} filter={"url(#" + id + "wood)"} />
      {/* Plank seams in the panels. */}
      {[innerX0 + 72, innerX0 + 144, innerX0 + 216].map((x) => (
        <rect key={x} x={x} y={OYA} width="1.6" height={OYB - OYA} fill={seam} opacity={0.32} />
      ))}
      {/* Recessed panels between the rails: a groove and a lit edge. */}
      {panels.map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="none" stroke={seam} strokeOpacity={0.3} strokeWidth="1.8" />
          <rect x={x + 2} y={y + 2} width={w} height={h} fill="none" stroke={hi} strokeOpacity={0.35} strokeWidth="1.2" />
        </g>
      ))}
      {/* Raised work: the echo arch, the stile, the rails and the meeting batten. */}
      <g filter={"url(#" + id + "mould)"}>
        <path d={ECHO_OUT + " " + ECHO_IN} fill={raised} fillRule="evenodd" />
        <rect x={stileX} y={OYA} width="18" height={OYB - OYA} fill={raised} />
        <rect x={batX} y={OYA} width="14" height={OYB - OYA} fill={raised} />
        {RAILS.map((y) => (
          <rect key={y} x={innerX0} y={y} width={innerX1 - innerX0} height="18" fill={raised} />
        ))}
      </g>
      {/* Iron straps on the hinge side. */}
      <g filter={"url(#" + id + "mould)"}>
        {[818, 1046].map((y) => (
          <path key={y} d={strap(y)} fill={iron} />
        ))}
      </g>
      {[818, 1046].map((y) =>
        [20, 58, 96].map((dx) => <circle key={y + "-" + dx} cx={strapX - side * dx} cy={y} r="3.2" fill={"url(#" + id + "stud)"} />),
      )}
      {/* Studs. */}
      {studs.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x + 1.1} cy={y + 1.6} r="3.9" fill={iron} opacity={0.3} />
          <circle cx={x} cy={y} r="3.6" fill={"url(#" + id + "stud)"} />
        </g>
      ))}
      {/* The rosette plate the ring hangs from. */}
      <g transform={"translate(" + plateX + " " + (RING_Y - 24) + ")"}>
        <circle cx="1.6" cy="2.4" r="13" fill={iron} opacity={0.32} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <ellipse key={i} cx="0" cy="-7" rx="4.6" ry="7.2" fill={"url(#" + id + "stud)"} transform={"rotate(" + i * 45 + ")"} />
        ))}
        <circle r="5.2" fill={"url(#" + id + "stud)"} stroke={dwzShade(pal.brass, -0.45)} strokeWidth=".8" />
        <path d="M-3.4 7 A3.6 3.6 0 0 0 3.4 7" fill="none" stroke={dwzShade(pal.brass, -0.3)} strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {/* The meeting line, deep in shadow. */}
      <rect x={side < 0 ? 498.4 : 500} y={OYA} width="1.6" height={OYB - OYA} fill={dwzShade(pal.door, -0.7)} opacity={0.7} />
    </svg>
  )
}

/** A gold ring, facing the viewer. */
function Ring({ id, pal, r }: { id: string; pal: Pal; r: number }) {
  return (
    <g>
      <circle cx="1.5" cy="2.2" r={r} fill="none" stroke="rgba(60,16,24,.3)" strokeWidth="4.4" />
      <circle r={r} fill="none" stroke={"url(#" + id + "gold)"} strokeWidth="4.2" />
      <circle r={r - 1.9} fill="none" stroke={dwzShade(pal.brass, -0.4)} strokeWidth=".8" opacity={0.7} />
      <path d={"M" + dwzN(-r * 0.72) + " " + dwzN(-r * 0.66) + " A" + r + " " + r + " 0 0 1 " + dwzN(r * 0.5) + " " + dwzN(-r * 0.85)} fill="none" stroke="#fff8e6" strokeWidth="1.5" strokeLinecap="round" opacity={0.9} />
    </g>
  )
}

/** The built-in "etc" ligature: a tall didone t whose bar shelters the e and whose foot cradles the c. */
function EtcMark({ id, color }: { id: string; color: string }) {
  return (
    <svg viewBox="0 0 200 182" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", maxWidth: "none", overflow: "visible" }}>
      <defs>
        <mask id={id + "e"}>
          <rect width="200" height="182" fill="#000" />
          <path d="M26 62 A24 28.5 0 1 0 74 62 A24 28.5 0 1 0 26 62 Z M37 62.5 A17 23 0 1 1 71 62.5 A17 23 0 1 1 37 62.5 Z" fill="#fff" fillRule="evenodd" />
          <rect x="33" y="58.6" width="40" height="3.8" fill="#fff" />
          <path d="M55 62.4 L96 62.4 L96 104 L59 104 Z" fill="#000" />
        </mask>
        <mask id={id + "c"}>
          <rect width="200" height="182" fill="#000" />
          <path d="M125 126 A23 26 0 1 0 171 126 A23 26 0 1 0 125 126 Z M136 126 A16 20.5 0 1 1 168 126 A16 20.5 0 1 1 136 126 Z" fill="#fff" fillRule="evenodd" />
          <path d="M150 119 L188 96 L188 156 L150 134 Z" fill="#000" />
        </mask>
      </defs>
      <g fill={color}>
        <rect width="200" height="182" mask={"url(#" + id + "e)"} />
        <rect width="200" height="182" mask={"url(#" + id + "c)"} />
        <circle cx="163.2" cy="111.4" r="6.6" />
        <path d="M95 34 L108.5 12 L113 12 L113 140 C113 157 123 165 137 165 C152 165 163 158 171 146 L174.5 148.5 C166 166 151 176.5 133 176.5 C109 176.5 95 162 95 139 Z" />
        <path d="M77 44 Q112 41.4 153 43 L153 48.4 Q112 46.8 77 49.2 Z" />
      </g>
    </svg>
  )
}

// ---- the sketch: every line of the doorway, drawn in order ----

function sketchPaths() {
  const out: { d: string; t?: string; a: number; b: number }[] = []
  const add = (d: string, a: number, b: number, t?: string) => out.push({ d, a, b, t })
  add("M80 1200 V150 H920 V1200", 0, 0.22)
  add("M99 1200 V169 H901 V1200", 0.05, 0.27)
  add("M127 1200 V197 H873 V1200", 0.08, 0.3)
  add("M171 1200 V241 H829 V1200", 0.12, 0.34)
  add("M180 1200 V250 H820 V1200", 0.14, 0.36)
  add(dwzOpening(MOULD), 0.24, 0.5)
  add(dwzOpening(0), 0.28, 0.54)
  add("M500 381 V1200", 0.42, 0.56)
  add(ECHO_OUT, 0.44, 0.64)
  for (const y of RAILS) add("M230 " + y + " H486 M514 " + y + " H770", 0.5, 0.66)
  add("M230 381 V1200 M770 381 V1200 M486 381 V1200 M514 381 V1200", 0.5, 0.7)
  let i = 0
  for (const g of RELIEF) {
    for (const p of g.parts) {
      const a = 0.58 + (i % 9) * 0.03
      add(p.d, a, a + 0.18, p.t)
      i++
    }
  }
  return out
}

const SKETCH = sketchPaths()

export default function DarwazaPreloader({
  children,
  progress,
  durationMs = 6400,
  scrollDistance = 1.6,
  lockScroll = true,
  preset = "gulabi",
  palette,
  title = "Pesh Karte Hain",
  monogram = "etc",
  logo,
  meta = "Portfolio · 2026",
  cue = "Scroll to enter",
  message = "Khush aamdeed.",
  hud = true,
  label = "Loading",
  displayFamily = DISPLAY_STACK,
  displayWeight = 700,
  serifFamily = SERIF_STACK,
  monoFamily = MONO_STACK,
  height = "100svh",
  onReady,
  onComplete,
  className = "",
}: DarwazaPreloaderProps) {
  const pal: Pal = { ...(PRESETS[preset] || PRESETS.gulabi), ...(palette || {}) } as Pal
  const palKey = JSON.stringify(pal)
  const id = "dwz" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const pinRef = React.useRef(null as HTMLDivElement | null)
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const gateRef = React.useRef(null as HTMLDivElement | null)
  const sceneRef = React.useRef(null as HTMLDivElement | null)
  const contentRef = React.useRef(null as HTMLDivElement | null)
  const titleRef = React.useRef(null as HTMLDivElement | null)
  const cueRef = React.useRef(null as HTMLDivElement | null)
  const metaRef = React.useRef(null as HTMLDivElement | null)
  const paintRef = React.useRef(null as HTMLDivElement | null)
  const paintInRef = React.useRef(null as HTMLDivElement | null)
  const sketchRef = React.useRef(null as HTMLDivElement | null)
  const sketchInRef = React.useRef(null as HTMLDivElement | null)
  const sheenRef = React.useRef(null as HTMLDivElement | null)
  const countRef = React.useRef(null as HTMLSpanElement | null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const [phase, setPhase] = React.useState("build" as "build" | "ready")
  const [showCue, setShowCue] = React.useState(false)
  const [widths, setWidths] = React.useState(null as number[] | null)
  const phaseRef = React.useRef(phase)
  const progressRef = React.useRef(progress)
  const onReadyRef = React.useRef(onReady)
  const onCompleteRef = React.useRef(onComplete)
  const durationRef = React.useRef(durationMs)
  React.useLayoutEffect(() => {
    phaseRef.current = phase
    progressRef.current = progress
    onReadyRef.current = onReady
    onCompleteRef.current = onComplete
    durationRef.current = durationMs
  })
  const rushRef = React.useRef(false)
  const letters = Array.from(title.toUpperCase())
  const fontSize = dwzTitleSize(letters.length)
  const travel = Math.round(Math.max(1, size.h) * Math.max(0.3, scrollDistance))

  // Measure the gate; the stage is fitted to it and the scroll travel is a multiple of its height.
  React.useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measure = () => {
      const r = wrap.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width))
      const h = Math.max(1, Math.round(r.height))
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  // Measure the title in its real face, again once web fonts have loaded.
  React.useLayoutEffect(() => {
    let alive = true
    const measure = () => {
      const c = document.createElement("canvas").getContext("2d")
      if (!c || !alive) return
      c.font = displayWeight + " " + fontSize + "px " + displayFamily
      setWidths(letters.map((ch) => c.measureText(ch).width + fontSize * 0.14))
    }
    measure()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure)
    return () => {
      alive = false
    }
  }, [title, displayFamily, displayWeight, fontSize])

  // Hold the page still while the doorway is being made.
  React.useEffect(() => {
    if (!lockScroll || phase !== "build") return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      html.style.overflow = prev
    }
  }, [lockScroll, phase])

  // The load: ease the shown value toward the target, draw the sketch, raise the colour, swell the relief.
  React.useEffect(() => {
    const root = gateRef.current
    if (!root) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const strokes = Array.from(root.querySelectorAll("[data-sa]")) as SVGPathElement[]
    const sa = strokes.map((el) => Number(el.getAttribute("data-sa")) || 0)
    const sb = strokes.map((el) => Number(el.getAttribute("data-sb")) || 1)
    const drawn = strokes.map(() => -1)
    const rels = Array.from(root.querySelectorAll("[data-ry]")) as HTMLElement[]
    const ry = rels.map((el) => Number(el.getAttribute("data-ry")) || 0)
    const on = rels.map(() => false)
    let shown = 0
    let last = -1
    let raf = 0
    const started = performance.now()

    const apply = (p: number) => {
      const { sketch, wash } = dwzWash(p)
      for (let i = 0; i < strokes.length; i++) {
        const v = Math.round(clamp01((sketch - sa[i]) / (sb[i] - sa[i])) * 500) / 500
        if (v !== drawn[i]) {
          drawn[i] = v
          strokes[i].style.strokeDashoffset = String(1 - v)
        }
      }
      const T = dwzEdge(wash)
      if (paintRef.current) paintRef.current.style.transform = "translate3d(0px," + dwzN(T) + "px,0px)"
      if (paintInRef.current) paintInRef.current.style.transform = "translate3d(0px," + dwzN(-T) + "px,0px)"
      if (sheenRef.current) sheenRef.current.style.opacity = dwzN(clamp01((1 - wash) * 12) * clamp01(wash * 30))
      const S = Math.min(0, T + FEATHER - SH)
      if (sketchRef.current) sketchRef.current.style.transform = "translate3d(0px," + dwzN(S) + "px,0px)"
      if (sketchInRef.current) sketchInRef.current.style.transform = "translate3d(0px," + dwzN(-S) + "px,0px)"
      if (sketchRef.current) sketchRef.current.style.visibility = wash >= 0.999 ? "hidden" : "visible"
      for (let i = 0; i < rels.length; i++) {
        const want = T + FEATHER * 0.55 < ry[i]
        if (want !== on[i]) {
          on[i] = want
          rels[i].setAttribute("data-on", want ? "1" : "0")
        }
      }
      const n = Math.floor(p)
      if (n !== last) {
        last = n
        if (countRef.current) countRef.current.textContent = (n < 10 ? "00" : n < 100 ? "0" : "") + n
        root.setAttribute("aria-valuenow", String(n))
      }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const real = progressRef.current
      const t = (now - started) / Math.max(800, durationRef.current)
      let target = real === undefined ? dwzSimulated(t) : Math.max(0, Math.min(100, Number(real) || 0))
      if (rushRef.current) target = 100
      shown = reduced ? target : Math.max(shown, shown + (target - shown) * (rushRef.current ? 0.09 : 0.08))
      if (target >= 100 && shown > 99.7) shown = 100
      apply(shown)
      if (shown >= 100) {
        cancelAnimationFrame(raf)
        setPhase("ready")
        onReadyRef.current?.()
      }
    }
    apply(0)
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Once ready, bring in the cue.
  React.useEffect(() => {
    if (phase !== "ready") return
    const t = window.setTimeout(() => setShowCue(true), CUE_MS)
    return () => clearTimeout(t)
  }, [phase])

  // The entrance, scrubbed by scroll: doors, light, the walk through, the page coming forward.
  React.useEffect(() => {
    if (phase !== "ready") return
    const gate = gateRef.current
    const pin = pinRef.current
    if (!gate || !pin) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const leaves = Array.from(gate.querySelectorAll(".dwz-leaf")) as HTMLElement[]
    const shades = Array.from(gate.querySelectorAll(".dwz-shade")) as HTMLElement[]
    const light = gate.querySelector(".dwz-light") as HTMLElement | null
    const cast = gate.querySelector(".dwz-cast") as SVGElement | null
    let raf = 0
    let entered = false
    let lastS = -1
    const update = () => {
      raf = 0
      const travelPx = Math.max(1, pin.offsetHeight - (contentRef.current ? contentRef.current.offsetHeight : 0))
      const s = clamp01(-pin.getBoundingClientRect().top / travelPx)
      if (Math.abs(s - lastS) < 0.0004) return
      lastS = s
      const k = dwzScrub(s)
      const zoom = Number(getComputedStyle(gate).getPropertyValue("--dwz-zoom")) || 2.5
      if (titleRef.current) {
        titleRef.current.style.opacity = dwzN(k.title)
        titleRef.current.style.transform = "translate3d(0px," + dwzN(-46 * (1 - k.title)) + "px,0px)"
      }
      if (cueRef.current) cueRef.current.style.opacity = dwzN(k.cue)
      if (metaRef.current) metaRef.current.style.opacity = dwzN(0.82 * k.cue)
      leaves.forEach((el, i) => {
        if (reduced) el.style.opacity = dwzN(1 - clamp01(s * 2.2))
        else el.style.transform = "rotateY(" + dwzN((i ? -1 : 1) * k.door) + "deg)"
      })
      shades.forEach((el) => (el.style.opacity = dwzN(reduced ? 0 : clamp01(k.door / 70))))
      if (light) light.style.opacity = dwzN(k.light * (1 - 0.85 * k.walk))
      if (cast) cast.style.opacity = dwzN(1 - 0.75 * k.light)
      if (sceneRef.current) sceneRef.current.style.transform = reduced ? "" : "scale(" + dwzN(1 + (zoom - 1) * k.walk) + ")"
      gate.style.opacity = dwzN(k.fade)
      gate.setAttribute("data-open", s > 0.002 ? "true" : "false")
      gate.setAttribute("data-gone", s >= 0.999 ? "true" : "false")
      if (s >= 0.999 && !entered) {
        entered = true
        onCompleteRef.current?.()
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
    }
  }, [phase])

  // Click or Enter: rush the load, or walk through the doors.
  const onActivate = () => {
    if (phaseRef.current === "build") {
      rushRef.current = true
      return
    }
    const pin = pinRef.current
    if (!pin) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: window.scrollY + pin.getBoundingClientRect().top + travel, behavior: reduced ? "auto" : "smooth" })
  }

  // Static art: built once per palette, never re-rendered by phase changes.
  const art = React.useMemo(
    () => (
      <>
        <div className="dwz-wipe dwz-sketch" ref={sketchRef}>
          <div className="dwz-wipe-in" ref={sketchInRef}>
            <svg className="dwz-svg dwz-full" viewBox="0 0 1000 1200" aria-hidden="true">
              {SKETCH.map((s, i) => (
                <path key={i} d={s.d} transform={s.t} pathLength={1} data-sa={s.a} data-sb={s.b} />
              ))}
            </svg>
          </div>
        </div>
        <div className="dwz-wipe dwz-paint" ref={paintRef}>
          <div className="dwz-wipe-in" ref={paintInRef}>
            <svg className="dwz-svg dwz-full" viewBox="0 0 1000 1200" aria-hidden="true">
              <Frame id={id} pal={pal} />
            </svg>
            <div className="dwz-doors" style={{ clipPath: 'path("' + dwzArch(0, OX1 - OX0, OYS - OYA, 0, OYB - OYA + 2, LOBES) + '")' }}>
              <div className="dwz-light" />
              {[-1, 1].map((side) => (
                <div key={side} className={"dwz-leaf " + (side < 0 ? "dwz-leaf-l" : "dwz-leaf-r")}>
                  <Leaf id={id} pal={pal} side={side} />
                  <div
                    className="dwz-dring"
                    style={{ left: 500 + side * RING_DX - (side < 0 ? OX0 : 500) - 24, top: RING_Y - OYA - 24, animationDelay: (side < 0 ? 200 : 360) + "ms" }}
                  >
                    <svg viewBox="-24 -24 48 48" style={{ width: 48, height: 48, display: "block", maxWidth: "none", overflow: "visible" }} aria-hidden="true">
                      <Ring id={id} pal={pal} r={15} />
                    </svg>
                  </div>
                  <div className="dwz-shade" />
                </div>
              ))}
            </div>
            <svg className="dwz-svg dwz-full dwz-cast" viewBox="0 0 1000 1200" aria-hidden="true">
              <g clipPath={"url(#" + id + "hole)"}>
                <path d={dwzOpening(0)} fill="none" stroke={dwzShade(pal.door, -0.75)} strokeWidth="34" strokeOpacity=".5" transform="translate(9 12)" style={{ filter: "blur(9px)" }} />
              </g>
            </svg>
          </div>
          <div className="dwz-sheen" ref={sheenRef} />
        </div>
        <Relief id={id} pal={pal} />
      </>
    ),
    [palKey, id],
  )

  const fit = dwzFit(size.w || SW, size.h || SH)
  const zoom = dwzZoom(size.w || SW, size.h || SH, fit.k)
  let place: number[][] = []
  let scale = 1
  if (widths) {
    const lay = dwzArcLayout(widths, TITLE_CX, TITLE_CY, TITLE_RX, TITLE_RY)
    scale = Math.min(1, (lay.total * 0.84) / Math.max(1, lay.used))
    place = scale < 1 ? dwzArcLayout(widths.map((w) => w * scale), TITLE_CX, TITLE_CY, TITLE_RX, TITLE_RY).places : lay.places
  }

  return (
    <div
      className={"dwz-root " + className}
      style={
        {
          "--dwz-wall": pal.wall,
          "--dwz-ink": pal.ink,
          "--dwz-display": displayFamily,
          "--dwz-weight": String(displayWeight),
          "--dwz-serif": serifFamily,
          "--dwz-mono": monoFamily,
        } as React.CSSProperties
      }
    >
      <style>{DWZ_CSS}</style>
      <div className="dwz-pin" ref={pinRef}>
        <div className="dwz-gatewrap" ref={wrapRef} style={{ height, marginBottom: "calc(-1 * " + height + ")" }}>
          <div
            ref={gateRef}
            className="dwz-gate"
            data-phase={phase}
            data-cue={showCue && !!cue ? "true" : "false"}
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            tabIndex={0}
            onClick={onActivate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onActivate()
              }
            }}
            style={
              {
                "--dwz-zoom": dwzN(zoom),
                "--dwz-ox": dwzN(fit.ox + 500 * fit.k) + "px",
                "--dwz-oy": dwzN(fit.oy + 790 * fit.k) + "px",
              } as React.CSSProperties
            }
          >
            <svg className="dwz-defs" aria-hidden="true">
              <Filters id={id} pal={pal} />
            </svg>
            <div className="dwz-scene" ref={sceneRef}>
              <svg className="dwz-wall" aria-hidden="true">
                <defs>
                  <mask id={id + "wallcut"} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                    <rect width="100%" height="100%" fill="#fff" />
                    <path d={dwzOpening(0)} fill="#000" transform={"translate(" + dwzN(fit.ox) + " " + dwzN(fit.oy) + ") scale(" + dwzN(fit.k) + ")"} />
                  </mask>
                </defs>
                <g mask={"url(#" + id + "wallcut)"}>
                  <rect width="100%" height="100%" fill={pal.wall} filter={"url(#" + id + "stucco)"} />
                  <rect width="100%" height="100%" fill={"url(#" + id + "vig)"} />
                </g>
              </svg>
              <div className="dwz-stage" style={{ transform: "translate(" + dwzN(fit.ox) + "px," + dwzN(fit.oy) + "px) scale(" + dwzN(fit.k) + ")" }}>
                {art}
                {/* The title, along the arch. */}
                <div className="dwz-title" ref={titleRef} aria-hidden="true">
                  {place.map(([x, y, r], i) => (
                    <span key={i} className="dwz-letter" style={{ left: Math.round(x * 100) / 100, top: Math.round(y * 100) / 100, transform: "rotate(" + dwzN(r) + "deg)" }}>
                      <span className="dwz-letter-i" style={{ fontSize: Math.round(fontSize * scale * 100) / 100, animationDelay: 120 + i * 55 + "ms" }}>
                        {letters[i] === " " ? " " : letters[i]}
                      </span>
                    </span>
                  ))}
                </div>
                {/* The mark above the doorway. */}
                <div className="dwz-logo" style={{ left: 380, top: 4, width: 240, height: 136 }}>
                  {logo ? logo : monogram === "etc" ? (
                    <div style={{ width: 150, height: 136 }}>
                      <EtcMark id={id + "m"} color={pal.ink} />
                    </div>
                  ) : (
                    <span className="dwz-logo-t" style={{ fontSize: 96 }}>{monogram}</span>
                  )}
                </div>
              </div>
            </div>
            {hud ? (
              <>
                <div className="dwz-hud dwz-tl" ref={metaRef} aria-hidden="true">{meta}</div>
                <div className="dwz-hud dwz-br" aria-hidden="true">
                  <span>{label}</span>
                  <span className="dwz-count" ref={countRef}>000</span>
                </div>
                {cue ? (
                  <div className="dwz-cue" ref={cueRef} aria-hidden="true">
                    <div className="dwz-cue-in">
                      <span>{cue}</span>
                      <span className="dwz-cue-line" />
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <span className="dwz-sr" aria-live="polite">
              {phase === "build" ? "" : title + ". " + (cue || "Ready")}
            </span>
          </div>
        </div>
        <div className="dwz-content" ref={contentRef} style={{ minHeight: height }}>
          {children ? (
            children
          ) : (
            <div className="dwz-behind" style={{ minHeight: height }}>
              <div className="dwz-behind-glow" />
              <div>
                <p>{message}</p>
                <small>Welcome in</small>
              </div>
            </div>
          )}
        </div>
        <div aria-hidden="true" style={{ height: travel }} />
      </div>
    </div>
  )
}
