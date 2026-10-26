"use client"

/**
 * Fruit Sticker Footer (from 21st.dev), used as the home page hero: a big headline ending in a hand-drawn script
 * word that writes itself (click it for the next one), with fruit stickers to drag around (click one to swap the
 * fruit, double-click the empty stage to tidy them). React is the only import; the script and every fruit are
 * drawn in code.
 *
 * Changes for Vasanam: `as` and `headingTag` (a <section> with an <h1> for the hero), `children` under the lines
 * (the sign-up buttons), the contact row and the © bar hide when empty, state set from effects only in callbacks
 * (lint), and the sticker motion records are created outside render.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react"

// #region script
// A fat monoline script, drawn as centre-lines and stroked. y points down: baseline 0, x-height -100, ascenders
// to -200, descenders to +100. Joined letters start at (0,-14) heading up-right and end at (advance,-14) the same
// way, so the pen never visibly lifts between them.
export const SCRIPT_STROKE = 34
export const SCRIPT_TOP = -230
export const SCRIPT_BOTTOM = 125

const IN = "M0,-14C6,-20 "
const out = (w: number) => " " + (w - 7) + ",-7 " + w + ",-14"
const outFlat = (w: number) => " " + (w - 6) + ",-12 " + w + ",-14"
// counter-clockwise bowl from its top-right corner, ending back up the right side
const bowl = (l: number, r: number) => {
  const m = (l + r) / 2
  return "C" + (m + 6) + ",-104 " + (l + 2) + ",-92 " + l + ",-52C" + (l - 1) + ",-18 " + (l + 12) + ",-3 " + (m - 2) + ",-3C" + (r - 8) + ",-3 " + (r + 2) + ",-30 " + (r + 2) + ",-62"
}
// lead-in that arcs up and over a bowl, landing on its top-right corner
const over = (l: number, r: number) => IN + (l - 2) + ",-50 " + (l + 14) + ",-88C" + (l + 26) + ",-104 " + (r - 10) + ",-104 " + r + ",-94"
// down a stem to the baseline, then out into the join
const down = (x: number, w: number) => "C" + (x - 1) + ",-60 " + (x - 4) + ",-24 " + (x - 2) + ",-12C" + x + ",-2 " + (x + 8) + ",-1 " + (x + 14) + ",-4C" + (w - 12) + ",-6" + out(w)
const stem = (x: number, top: number, w: number) => "M" + x + "," + top + down(x, w)
// an n-hump from the baseline at x0 over to a stem at x1
const arch = (x0: number, x1: number) => "C" + (x0 + 4) + ",-60 " + (x0 + 14) + ",-98 " + ((x0 + x1) / 2 + 2) + ",-98C" + (x1 + 6) + ",-98 " + (x1 + 4) + ",-70 " + (x1 + 1) + ",-44"
// a tall looped ascender rising out of the lead-in, coming back down at x
const loopUp = (x: number) => IN + (x + 18) + ",-40 " + (x + 38) + ",-108C" + (x + 52) + ",-152 " + (x + 48) + ",-200 " + (x + 26) + ",-198C" + (x + 4) + ",-196 " + (x - 2) + ",-150 " + x + ",-110"
// a looped descender from x down and back up into the join
const loopDown = (x: number, w: number) => "C" + x + ",-30 " + (x - 1) + ",30 " + (x - 6) + ",62C" + (x - 12) + ",94 " + (x - 42) + ",104 " + (x - 48) + ",82C" + (x - 54) + ",58 " + (x - 14) + ",8 " + (x + 12) + ",-6C" + (w - 12) + ",-12" + outFlat(w)
const entry = (x: number) => IN + (x - 4) + ",-50 " + x + ",-96"

// [advance, centre-line]. "M x,y L x,y" is a dot.
export const GLYPHS: Record<string, [number, string]> = {
  a: [100, over(18, 70) + bowl(16, 70) + stem(74, -98, 100)],
  b: [92, loopUp(16) + "C16,-60 15,-30 14,-8C24,-60 40,-98 58,-96C76,-94 76,-60 66,-30C58,-6 38,0 30,-12C40,-14 60,-14 74,-12C80,-12 86,-13 92,-14"],
  c: [80, IN + "16,-50 30,-82C42,-104 70,-104 66,-84C64,-76 58,-80 56,-84C50,-98 22,-96 16,-56C12,-24 26,-3 42,-3C58,-3" + out(80)],
  d: [100, over(18, 70) + bowl(16, 70) + stem(78, -192, 100)],
  e: [80, IN + "36,-40 52,-56C66,-72 66,-100 46,-100C24,-100 14,-74 14,-50C14,-20 28,-3 44,-3C58,-3" + out(80)],
  f: [74, loopUp(16) + "C16,-40 18,30 14,70C12,94 -6,96 -4,74C-2,50 30,-2 46,-8C62,-12" + outFlat(74)],
  g: [96, over(18, 70) + bowl(16, 70) + "M72,-98" + loopDown(72, 96)],
  h: [100, loopUp(16) + "C16,-60 15,-30 14,-2" + arch(14, 70) + down(71, 100)],
  i: [52, entry(26) + down(26, 52) + "M30,-146L30,-146"],
  j: [62, entry(26) + loopDown(26, 62) + "M32,-146L32,-146"],
  k: [96, loopUp(16) + "C16,-60 15,-30 14,-2C22,-56 40,-100 60,-98C80,-96 72,-56 30,-50C48,-44 56,-12 66,-6C72,-2 78,-3 84,-6C88,-8" + out(96)],
  l: [60, loopUp(16) + "C16,-60 14,-30 16,-14C18,-2 26,-1 32,-3C48,-6" + out(60)],
  m: [138, entry(18) + "C18,-60 16,-30 14,-2" + arch(14, 56) + "C56,-30 56,-14 56,-2" + arch(56, 108) + down(109, 138)],
  n: [102, entry(18) + "C18,-60 16,-30 14,-2" + arch(14, 72) + down(73, 102)],
  o: [92, IN + "16,-50 32,-88C30,-104 14,-84 14,-54C14,-22 28,-3 44,-3C62,-3 72,-30 70,-60C68,-90 52,-104 44,-94C38,-86 54,-74 66,-60C72,-52 80,-30 92,-14"],
  p: [96, entry(20) + "L14,92M14,-36C18,-60 28,-98 44,-98C76,-98 78,-60 68,-30C60,-6 40,0 30,-12C42,-14 62,-14 76,-13C82,-13 88,-13 96,-14"],
  q: [100, over(18, 70) + bowl(16, 70) + "M74,-98C73,-40 72,40 70,80C69,96 58,92 62,74C68,40 80,-6 100,-14"],
  r: [80, entry(18) + "C18,-60 16,-30 14,-2C20,-50 34,-90 50,-96C60,-100 64,-90 58,-82C54,-78 50,-82 52,-76C56,-50 56,-16 62,-8C66,-3" + out(80)],
  s: [76, IN + "20,-60 34,-100C40,-76 66,-54 58,-26C52,-2 22,0 10,-18C24,-6 50,-6 62,-10C66,-11" + out(76)],
  t: [72, IN + "20,-80 30,-170" + down(30, 72) + "M8,-104C24,-106 44,-108 62,-110"],
  u: [100, entry(18) + "C16,-60 12,-30 14,-16C16,-2 30,-2 42,-6C56,-12 66,-50 70,-96" + down(70, 100)],
  v: [84, entry(18) + "C18,-60 22,-10 38,-4C56,2 66,-40 64,-96C66,-60 70,-24 78,-18C80,-16 82,-15 84,-14"],
  w: [124, entry(18) + "C16,-60 14,-4 34,-4C50,-4 56,-50 58,-80C58,-50 62,-4 82,-4C98,-4 106,-50 104,-96C106,-60 110,-24 118,-18C120,-16 122,-15 124,-14"],
  x: [92, IN + "18,-60 28,-80C38,-100 54,-100 54,-80C54,-50 50,-20 60,-8C66,-2 72,-4 80,-8C84,-10" + out(92) + "M20,-10C38,-40 58,-74 78,-98"],
  y: [96, entry(18) + "C16,-60 12,-30 14,-16C16,-2 30,-2 42,-6C56,-12 66,-50 70,-96" + loopDown(70, 96)],
  z: [88, IN + "20,-60 36,-90C46,-104 70,-104 64,-80C58,-60 34,-34 18,-10C34,-30 64,-24 60,10C56,60 20,96 12,72C6,52 40,-6 70,-12C76,-13 82,-13 88,-14"],
  "!": [56, "M42,-194C38,-150 32,-96 28,-52M22,-8L22,-8"],
  "?": [72, "M10,-160C14,-196 66,-200 62,-160C60,-128 30,-112 30,-60M26,-8L26,-8"],
  ".": [36, "M16,-8L16,-8"],
  ",": [36, "M20,-8C18,10 12,22 4,30"],
  "'": [30, "M22,-192L16,-140"],
  " ": [44, ""],
}

export type ScriptStroke = { d: string; len: number }
export type ScriptGlyph = { ch: string; x: number; strokes: ScriptStroke[]; dots: [number, number][] }

// Accents fold onto their base letter (adiós → adios), curly quotes onto '.
export const normalise = (word: string) =>
  word.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’]/g, "'").toLowerCase()

export const supports = (word: string) => [...normalise(word)].every((ch) => ch in GLYPHS)

// Length of an M/L/C path, flattening each curve into short chords.
export const pathLength = (d: string) => {
  const nums = (d.match(/-?\d*\.?\d+/g) || []).map(Number)
  const cmds = d.match(/[MLC]/g) || []
  let i = 0
  let x = 0
  let y = 0
  let len = 0
  for (const c of cmds) {
    if (c === "M") {
      x = nums[i++]
      y = nums[i++]
    } else if (c === "L") {
      const nx = nums[i++]
      const ny = nums[i++]
      len += Math.hypot(nx - x, ny - y)
      x = nx
      y = ny
    } else {
      const p = nums.slice(i, i + 6)
      i += 6
      let px = x
      let py = y
      for (let k = 1; k <= 16; k++) {
        const t = k / 16
        const u = 1 - t
        const qx = u * u * u * x + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t * t * t * p[4]
        const qy = u * u * u * y + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t * t * t * p[5]
        len += Math.hypot(qx - px, qy - py)
        px = qx
        py = qy
      }
      x = p[4]
      y = p[5]
    }
  }
  return len
}

export const layoutWord = (word: string) => {
  const glyphs: ScriptGlyph[] = []
  let x = 0
  for (const ch of normalise(word)) {
    const g = GLYPHS[ch] ?? GLYPHS[" "]
    const strokes: ScriptStroke[] = []
    const dots: [number, number][] = []
    for (const sub of g[1].split(/(?=M)/)) {
      if (!sub) continue
      const dot = sub.match(/^M(-?[\d.]+),(-?[\d.]+)L\1,\2$/)
      if (dot) dots.push([+dot[1], +dot[2]])
      else strokes.push({ d: sub, len: pathLength(sub) })
    }
    glyphs.push({ ch, x, strokes, dots })
    x += g[0]
  }
  return { glyphs, width: x }
}

// Pen timing: a constant speed along every stroke, a short lift between them.
export const PEN_SPEED = 1700
export const PEN_LIFT = 0.05
export const timeWord = (glyphs: ScriptGlyph[]) => {
  let t = 0
  return {
    glyphs: glyphs.map((g) => {
      const strokes = g.strokes.map((s) => {
        const at = { ...s, delay: t, dur: Math.max(0.08, s.len / PEN_SPEED) }
        t += at.dur + PEN_LIFT
        return at
      })
      const dots = g.dots.map((p) => {
        const at = { x: p[0], y: p[1], delay: t }
        t += 0.08
        return at
      })
      return { ...g, strokes, dots }
    }),
    total: t,
  }
}

// Clamp a sticker's offset so its centre stays inside the section.
export const clampOffset = (v: number, min: number, max: number) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v)))

// One tick of a damped spring. Returns the new [position, velocity].
export const spring = (x: number, v: number, target: number, k: number, damp: number) => {
  const nv = (v + (target - x) * k) * damp
  return [x + nv, nv] as const
}
// #endregion

// ---- fruit -------------------------------------------------------------------

export type Fruit = "strawberry" | "banana" | "chili" | "orange" | "cherry" | "lemon" | "watermelon" | "pear"
  // Vasanam's own: video and subtitles
  | "clapper" | "mic" | "cc" | "bubble" | "play" | "reel" | "headphones" | "wave"

export const FRUITS: Fruit[] = ["strawberry", "banana", "chili", "orange", "cherry", "lemon", "watermelon", "pear"]
/** Video and subtitle stickers (the Vasanam hero swaps among these). */
export const MEDIA: Fruit[] = ["clapper", "mic", "cc", "bubble", "play", "reel", "headphones", "wave"]

// The sticker each fruit is printed on when it's swapped in.
const PAPER: Record<Fruit, string> = {
  strawberry: "#f7cf45",
  banana: "#3f6fe6",
  chili: "#f6a9c4",
  orange: "#cdb8f2",
  cherry: "#bfe5c6",
  lemon: "#ff8f70",
  watermelon: "#fde7a6",
  pear: "#ffb8a6",
  clapper: "#ffd23f",
  mic: "#9ab8ff",
  cc: "#d4ff3f",
  bubble: "#ffb6e1",
  play: "#ffe7a3",
  reel: "#b8f0d2",
  headphones: "#cdb8f2",
  wave: "#ff9f80",
}

const NAMES: Record<Fruit, string> = {
  strawberry: "Strawberry",
  banana: "Banana",
  chili: "Chili",
  orange: "Orange",
  cherry: "Cherries",
  lemon: "Lemon",
  watermelon: "Watermelon",
  pear: "Pear",
  clapper: "Clapperboard",
  mic: "Microphone",
  cc: "Captions",
  bubble: "Tamil speech bubble",
  play: "Play button",
  reel: "Film reel",
  headphones: "Headphones",
  wave: "Sound wave",
}

const shine = (cx: number, cy: number, rx: number, ry: number, rot: number) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity={0.38} transform={"rotate(" + rot + " " + cx + " " + cy + ")"} />
)
const leaf = (d: string, vein: string) => (
  <>
    <path d={d} fill="#46ad4f" />
    <path d={vein} fill="none" stroke="#2f8a3c" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
  </>
)

const STRAWBERRY_SEEDS = [
  [-21, -13], [-6, -15], [9, -15], [24, -12], [-27, 2], [-13, 0], [2, 0], [17, 0], [29, 3], [-18, 14], [-3, 15], [12, 14], [-9, 27], [5, 27],
]

const ART: Record<Fruit, ReactNode> = {
  strawberry: (
    <g>
      <path fill="#e8333d" d="M0,40C-13,40 -37,17 -39,-5C-41,-22 -29,-31 -15,-29C-8,-28 -3,-26 0,-25C3,-26 8,-28 15,-29C29,-31 41,-22 39,-5C37,17 13,40 0,40Z" />
      <path fill="#c51f2d" d="M39,-5C37,17 13,40 0,40C11,31 27,11 29,-9C30,-19 27,-26 22,-29C33,-28 41,-20 39,-5Z" />
      {shine(-24, -12, 7, 3.6, -38)}
      {STRAWBERRY_SEEDS.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={1.7} ry={3} fill="#8c1121" opacity={0.75} transform={"rotate(" + x * 0.6 + " " + x + " " + y + ")"} />
      ))}
      <path fill="#43ab4c" stroke="#43ab4c" strokeWidth={3} strokeLinejoin="round" d="M0,-24L-22,-30L-10,-33L-17,-43L-4,-37L0,-47L4,-37L17,-43L10,-33L22,-30Z" />
      <path d="M0,-40C1,-46 3,-50 8,-53" fill="none" stroke="#2f8a3c" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  banana: (
    <g transform="rotate(-8)">
      <g transform="translate(-3,-13) rotate(-10)">
        <path fill="#ffe27a" d="M-38,-14C-34,12 2,30 32,8L36,4C38,2 36,-2 33,-1C10,12 -18,6 -30,-16C-32,-20 -38,-19 -38,-14Z" />
        <path fill="#efb93a" d="M-38,-14C-34,12 2,30 32,8C4,22 -26,10 -38,-14Z" />
        <path fill="#7a5a2e" d="M33,-1L40,-6L43,-2L36,4Z" />
      </g>
      <path fill="#ffd43c" d="M-38,-14C-34,12 2,30 32,8L36,4C38,2 36,-2 33,-1C10,12 -18,6 -30,-16C-32,-20 -38,-19 -38,-14Z" />
      <path fill="#e9a920" d="M-38,-14C-34,12 2,30 32,8C4,22 -26,10 -38,-14Z" />
      <path d="M-26,-6C-14,8 6,12 22,6" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity={0.45} />
      <ellipse cx={-36} cy={-16} rx={2.6} ry={3.2} fill="#5b4020" />
      <path fill="#7a5a2e" d="M33,-1L41,-7L44,-2L36,4Z" />
    </g>
  ),
  chili: (
    <g transform="scale(1.32) rotate(-8)">
      <path fill="#e8392b" d="M-38,16C-24,26 8,22 26,2C32,-4 30,-12 22,-10C8,0 -12,8 -34,8C-40,8 -42,13 -38,16Z" />
      <path fill="#c02a1f" d="M-38,16C-24,26 8,22 26,2C10,16 -16,20 -38,16Z" />
      <path d="M-26,10C-10,8 6,2 16,-5" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" opacity={0.42} />
      <path fill="#4aa944" d="M19,-11C23,-18 32,-18 34,-10C35,-4 29,0 24,-2C22,-6 20,-8 19,-11Z" />
      <path d="M30,-15C31,-24 37,-29 44,-27" fill="none" stroke="#3a8d39" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  orange: (
    <g transform="scale(1.16)">
      <circle r={32} fill="#ff8b1d" />
      <path fill="#ee700f" d="M32,0A32,32 0 0 1 -20,25C2,30 26,20 32,0Z" />
      {shine(-13, -15, 8, 4.2, -38)}
      {[[-4, -2], [8, -14], [14, 4], [-14, 12], [2, 14], [-20, -2], [18, -6]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.1} fill="#d9620b" opacity={0.55} />
      ))}
      <circle cx={0} cy={-30} r={3.4} fill="#3b7a2c" />
      {leaf("M2,-31C8,-44 22,-47 29,-41C23,-32 11,-28 2,-31Z", "M5,-32C12,-37 19,-40 25,-41")}
    </g>
  ),
  cherry: (
    <g transform="translate(0,4)">
      <path d="M-14,4C-12,-14 0,-30 9,-39M16,8C15,-8 13,-26 9,-39" fill="none" stroke="#6f4a26" strokeWidth={3.6} strokeLinecap="round" />
      {leaf("M9,-39C17,-51 33,-50 38,-42C28,-35 18,-35 9,-39Z", "M12,-39C20,-42 27,-43 34,-43")}
      <circle cx={-14} cy={16} r={16} fill="#d21f37" />
      <path fill="#a8142a" d="M2,16A16,16 0 0 1 -26,26C-14,34 2,30 2,16Z" />
      {shine(-20, 9, 4.4, 2.6, -40)}
      <circle cx={16} cy={20} r={16} fill="#e72c45" />
      <path fill="#b8182f" d="M32,20A16,16 0 0 1 4,30C16,38 32,34 32,20Z" />
      {shine(10, 13, 4.4, 2.6, -40)}
    </g>
  ),
  lemon: (
    <g transform="rotate(-22) scale(1.12)">
      <path fill="#ffe24b" d="M-34,0C-34,-18 -17,-28 0,-28C17,-28 34,-18 34,0C34,18 17,28 0,28C-17,28 -34,18 -34,0ZM-33,-4L-41,-2L-33,4ZM33,-4L41,-1L33,4Z" />
      <path fill="#f3c22a" d="M34,0C34,18 17,28 0,28C-17,28 -34,18 -34,0C-24,16 20,18 34,0Z" />
      {shine(-12, -14, 9, 4, -8)}
      {[[-6, -4], [10, -8], [16, 6], [-18, 6], [2, 10]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1} fill="#d9a514" opacity={0.6} />
      ))}
      {leaf("M30,-14C36,-28 50,-30 56,-24C50,-14 38,-10 30,-14Z", "M33,-15C40,-20 46,-23 52,-24")}
    </g>
  ),
  watermelon: (
    <g transform="translate(0,-4) rotate(8)">
      <path fill="#3d9a49" d="M-42,-10A42,42 0 0 0 42,-10Z" />
      <path fill="#2f7f3b" d="M-42,-10A42,42 0 0 0 42,-10L36,-10A36,36 0 0 1 -36,-10Z" opacity={0.6} />
      <path fill="#e9f6cf" d="M-37,-10A37,37 0 0 0 37,-10Z" />
      <path fill="#ff5068" d="M-33,-10A33,33 0 0 0 33,-10Z" />
      <path fill="#e53a55" d="M33,-10A33,33 0 0 1 -6,22C14,16 28,4 33,-10Z" />
      {[[-18, -2], [-6, 4], [8, 2], [20, -2], [-10, 12], [4, 14]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={1.8} ry={3} fill="#2a1717" transform={"rotate(" + -x * 0.8 + " " + x + " " + y + ")"} />
      ))}
      <path d="M-28,-6C-20,-6 -14,-6 -8,-6" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity={0.45} />
    </g>
  ),
  pear: (
    <g transform="rotate(10) translate(0,4)">
      <path fill="#b6d74b" d="M0,-30C10,-30 12,-18 14,-10C16,0 30,6 30,20C30,34 16,40 0,40C-16,40 -30,34 -30,20C-30,6 -16,0 -14,-10C-12,-18 -10,-30 0,-30Z" />
      <path fill="#97bc35" d="M14,-10C16,0 30,6 30,20C30,34 16,40 0,40C14,32 22,20 18,8C16,2 12,-4 14,-10Z" />
      {shine(-14, 12, 5, 8, 18)}
      <path d="M0,-28C0,-36 2,-42 6,-46" fill="none" stroke="#6f4a26" strokeWidth={3.6} strokeLinecap="round" />
      {leaf("M3,-38C10,-50 24,-50 28,-43C20,-36 11,-35 3,-38Z", "M6,-39C13,-42 19,-43 24,-43")}
    </g>
  ),

  clapper: (
    <g transform="rotate(-6)">
      <rect x={-34} y={-12} width={68} height={44} rx={6} fill="#1d1c22" />
      <rect x={-34} y={-12} width={68} height={10} fill="#2c2b33" />
      <path d="M-26,6H18M-26,16H8M-26,24H14" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.55} />
      <g transform="rotate(-16 -34 -14)">
        <rect x={-34} y={-30} width={68} height={14} rx={3} fill="#1d1c22" />
        <path d="M-26,-30L-18,-16M-10,-30L-2,-16M6,-30L14,-16M22,-30L30,-16" stroke="#fff" strokeWidth={5} />
      </g>
      <circle cx={-34} cy={-15} r={3.4} fill="#c9c6d6" />
    </g>
  ),
  mic: (
    <g transform="rotate(12)">
      <rect x={-13} y={-40} width={26} height={44} rx={13} fill="#2b2a33" />
      <path d="M-13,-26H13M-13,-17H13M-13,-8H13" stroke="#5b5a66" strokeWidth={2.4} />
      {shine(-6, -32, 3, 6, 0)}
      <path d="M-22,-6C-22,14 22,14 22,-6" fill="none" stroke="#2b2a33" strokeWidth={5} strokeLinecap="round" />
      <path d="M0,11V30M-14,32H14" stroke="#2b2a33" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  cc: (
    <g transform="rotate(-8)">
      <rect x={-38} y={-26} width={76} height={52} rx={12} fill="#141414" />
      <text x={0} y={13} textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight={900} fontSize={36} fill="#fff" letterSpacing={-1}>CC</text>
    </g>
  ),
  bubble: (
    <g transform="rotate(6)">
      <path d="M-34,-28H34A10,10 0 0 1 44,-18V14A10,10 0 0 1 34,24H-4L-22,40L-18,24H-34A10,10 0 0 1 -44,14V-18A10,10 0 0 1 -34,-28Z" fill="#fff" />
      <text x={0} y={12} textAnchor="middle" fontFamily="'Noto Sans Tamil', 'Mukta Malar', sans-serif" fontWeight={800} fontSize={40} fill="#8a1550">த</text>
    </g>
  ),
  play: (
    <g>
      <circle r={34} fill="#ff3b30" />
      <path fill="#d52a20" d="M34,0A34,34 0 0 1 -22,26C4,32 30,20 34,0Z" />
      {shine(-14, -16, 8, 4, -38)}
      <path d="M-9,-16L18,0L-9,16Z" fill="#fff" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
    </g>
  ),
  reel: (
    <g transform="rotate(14)">
      <circle r={36} fill="#2b2a33" />
      <circle r={9} fill="#c9c6d6" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.round(Math.cos((a * Math.PI) / 180) * 21)} cy={Math.round(Math.sin((a * Math.PI) / 180) * 21)} r={8} fill="#141414" />
      ))}
      <path d="M30,20C40,30 44,38 46,44" fill="none" stroke="#2b2a33" strokeWidth={7} strokeLinecap="round" />
    </g>
  ),
  headphones: (
    <g>
      <path d="M-30,10V0C-30,-22 -16,-34 0,-34C16,-34 30,-22 30,0V10" fill="none" stroke="#2b2a33" strokeWidth={7} strokeLinecap="round" />
      <rect x={-38} y={2} width={18} height={30} rx={8} fill="#2b2a33" />
      <rect x={20} y={2} width={18} height={30} rx={8} fill="#2b2a33" />
      <rect x={-34} y={6} width={6} height={22} rx={3} fill="#5b7cff" />
      <rect x={28} y={6} width={6} height={22} rx={3} fill="#5b7cff" />
    </g>
  ),
  wave: (
    <g>
      {[[-30, 12], [-20, 24], [-10, 36], [0, 22], [10, 40], [20, 26], [30, 14]].map(([x, h], i) => (
        <rect key={i} x={x - 3.5} y={-h / 2} width={7} height={h} rx={3.5} fill="#1d1c22" />
      ))}
    </g>
  ),
}

// ---- types -------------------------------------------------------------------

export type StickerSpec = {
  fruit: Fruit
  /** Where the sticker's centre sits, in % of the headline block. */
  x: number
  y: number
  /** Diameter as a fraction of the headline's font size. */
  size?: number
  /** Resting tilt in degrees. */
  rotate?: number
  /** Sticker paper. Defaults to the fruit's own colour. */
  color?: string
  /** "oval" is 1.3× wider than tall. */
  shape?: "disc" | "oval"
  /** Tuck it under the headline instead of over it. */
  behind?: boolean
}

export type FooterLink = { label: string; href?: string }

export interface FruitStickerProps {
  /** The root element: a footer by default, a section for a hero. */
  as?: "footer" | "section"
  /** The headline's tag: h1 for a hero. */
  headingTag?: "h1" | "h2"
  headline?: string
  /** Click the script word to cycle these. a–z, ! ? . , ' and spaces. */
  farewells?: string[]
  lines?: string[]
  /** Shown under the lines (buttons, a note). */
  children?: ReactNode
  /** "" hides the copy-email button; with no links too, the contact row goes. */
  email?: string
  links?: FooterLink[]
  /** "" hides the © bar. */
  name?: string
  year?: number
  stickers?: StickerSpec[]
  /** What a sticker can swap to when clicked. Default: the fruit. */
  cycle?: Fruit[]
  /** Script colour. */
  accent?: string
  ink?: string
  muted?: string
  background?: string
  fontSans?: string
  /** Minimum height of the section. */
  height?: string
  onFarewell?: (index: number, word: string) => void
  onStickerSwap?: (sticker: number, fruit: Fruit) => void
  onCopy?: (email: string) => void
  onLinkClick?: (label: string, href?: string) => void
  onBackToTop?: () => void
  className?: string
}

const DEFAULT_STICKERS: StickerSpec[] = [
  { fruit: "strawberry", x: 2, y: 66, size: 0.92, rotate: -8 },
  { fruit: "banana", x: 10.5, y: 98, size: 0.72, rotate: 10 },
  { fruit: "chili", x: 63, y: -28, size: 0.64, rotate: -10, shape: "oval", behind: true },
  { fruit: "orange", x: 99, y: 84, size: 0.56, rotate: 6, shape: "oval" },
]

const DEFAULT_LINKS: FooterLink[] = [
  { label: "Instagram", href: "#" },
  { label: "Dribbble", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Read.cv", href: "#" },
]

// ---- styles ------------------------------------------------------------------

const EASE_OUT = "cubic-bezier(.2,.9,.3,1)"
const EASE_BOUNCE = "cubic-bezier(.3,1.6,.5,1)"

const CSS =
  ".fsf{position:relative;isolation:isolate;container-type:inline-size;display:flex;flex-direction:column;width:100%;box-sizing:border-box;overflow:hidden;overflow:clip;color:var(--fsf-ink);background:var(--fsf-bg);font-family:var(--fsf-font);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}" +
  ":where(.fsf) *{box-sizing:border-box}" +
  ":where(.fsf) button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit}" +
  ":where(.fsf) a{color:inherit;text-decoration:none}" +
  ".fsf-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
  ".fsf-stage{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(5rem,13cqw,11rem) 4cqw clamp(4rem,9cqw,8rem)}" +
  ".fsf-cluster{position:relative;display:flex;flex-direction:column;align-items:center;font-size:min(8.2cqw,8.75rem);line-height:1}" +
  ".fsf-head{position:relative;z-index:2;display:flex;align-items:baseline;margin:0;white-space:nowrap;font-size:1em;font-weight:700;letter-spacing:-.045em;line-height:1}" +
  ".fsf-line{display:inline-block}" +
  ".fsf-ch{display:inline-block;transition:translate .45s " + EASE_BOUNCE + ",rotate .45s " + EASE_BOUNCE + "}" +
  ".fsf-ch:hover{translate:0 -.07em;rotate:-4deg}" +
  ".fsf-script{position:relative;display:inline-block;height:1em;margin-left:.05em;transition:width .7s " + EASE_OUT + ";cursor:pointer;letter-spacing:0;border-radius:.12em;-webkit-user-select:none;user-select:none}" +
  ".fsf-script:focus-visible{outline:.025em solid var(--fsf-accent);outline-offset:.06em}" +
  ".fsf-script svg{position:absolute;overflow:visible;max-width:none;pointer-events:none;transform-origin:20% 70%}" +
  ".fsf-g{transform-box:fill-box;transform-origin:50% 100%}" +
  ".fsf-script:hover .fsf-g{animation:fsf-wig .7s ease both;animation-delay:calc(var(--gi) * 55ms)}" +
  ".fsf-p{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 2;stroke-dashoffset:0}" +
  ".fsf-m .fsf-p{stroke:var(--fsf-accent)}" +
  ".fsf-s .fsf-p{stroke:var(--fsf-shade)}" +
  ".fsf-h .fsf-p{stroke:#fff;stroke-opacity:.18}" +
  ".fsf-m .fsf-dot{fill:var(--fsf-accent)}" +
  ".fsf-s .fsf-dot{fill:var(--fsf-shade)}" +
  ".fsf-h .fsf-dot{fill:#fff;fill-opacity:.18}" +
  ".fsf-dot{transform-box:fill-box;transform-origin:center}" +
  ".fsf-sub{position:relative;z-index:2;margin:.32em 0 0;font-size:max(.165em,.8125rem);font-weight:500;line-height:1.4;letter-spacing:-.01em;text-align:center}" +
  ".fsf-sub span{display:block}" +
  ".fsf-extra{position:relative;z-index:2;font-size:1rem;line-height:1.5;letter-spacing:0;margin-top:1.4rem;display:grid;justify-items:center;gap:.8rem}" +
  // stickers: outer (pointer + spring) > in (entrance) > bob (idle) > body (paper)
  ".fsf-stk{position:absolute;left:var(--x);top:var(--y);z-index:3;width:var(--w);height:var(--h);margin:calc(var(--h) / -2) 0 0 calc(var(--w) / -2);touch-action:none;will-change:transform}" +
  ".fsf-stk.is-behind{z-index:1}" +
  ".fsf-stk.is-top{z-index:4}" +
  ".fsf-stk-in,.fsf-stk-bob{width:100%;height:100%}" +
  ".fsf-stk-bob{animation:fsf-bob 6s ease-in-out infinite;animation-delay:var(--bd)}" +
  ".fsf-stk.is-drag .fsf-stk-bob{animation-play-state:paused}" +
  ".fsf-stk-body{position:relative;display:block;width:100%;height:100%;border-radius:50%;overflow:hidden;background:var(--c);rotate:var(--r);cursor:grab;transition:background-color .2s;box-shadow:inset 0 0 0 .028em rgba(255,255,255,.42),inset 0 -.045em .08em rgba(0,0,0,.08),0 calc(.018em + var(--lift,0) * .14em) calc(.035em + var(--lift,0) * .2em) rgba(30,18,6,calc(.2 + var(--lift,0) * .08))}" +
  ".fsf-stk.is-drag .fsf-stk-body{cursor:grabbing}" +
  ".fsf-stk-body::after{content:\"\";position:absolute;inset:-30%;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.5) 49%,transparent 60%);transform:translateX(-75%);transition:transform .9s " + EASE_OUT + ";pointer-events:none}" +
  ".fsf-stk-body:hover::after,.fsf-stk-body:focus-visible::after,.fsf-stk.is-drag .fsf-stk-body::after{transform:translateX(75%)}" +
  ".fsf-stk-body:focus-visible{outline:.025em solid var(--fsf-ink);outline-offset:.05em}" +
  ".fsf-fruit{position:absolute;left:50%;top:50%;width:var(--f);height:var(--f);margin:calc(var(--f) / -2) 0 0 calc(var(--f) / -2);max-width:none;overflow:visible;pointer-events:none}" +
  // contact + bar
  ".fsf-contact{position:relative;z-index:2;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.9rem 2rem;padding:0 1.5rem clamp(2rem,4cqw,3.25rem);font-size:.9375rem}" +
  ".fsf-mail{position:relative;display:inline-flex;align-items:center;gap:.65em;padding:.55em 1.1em .55em .55em;border-radius:999px;border:1px solid color-mix(in oklab,var(--fsf-ink) 16%,transparent);font-weight:500;transition:background-color .35s,color .35s,border-color .35s,translate .45s " + EASE_BOUNCE + "}" +
  ".fsf-mail:hover,.fsf-mail:focus-visible{background:var(--fsf-ink);color:var(--fsf-bg);border-color:var(--fsf-ink);translate:0 -2px}" +
  ".fsf-mail:focus-visible{outline:2px solid var(--fsf-accent);outline-offset:3px}" +
  ".fsf-mail-ico{position:relative;display:grid;place-items:center;width:2em;height:2em;border-radius:50%;background:var(--fsf-accent);color:#fff;flex:none;transition:rotate .5s " + EASE_BOUNCE + "}" +
  ".fsf-mail:hover .fsf-mail-ico{rotate:-14deg}" +
  ".fsf-mail-ico svg{width:1.05em;height:1.05em;max-width:none;overflow:visible}" +
  ".fsf-mail-tag{position:relative;display:inline-grid;font-size:.78em;color:var(--fsf-muted);transition:color .35s}" +
  ".fsf-mail-tag>span{grid-area:1/1;transition:opacity .3s,translate .45s " + EASE_BOUNCE + "}" +
  ".fsf-mail:hover .fsf-mail-tag{color:inherit;opacity:.7}" +
  ".fsf-mail-tag .is-done{opacity:0;translate:0 .6em;color:var(--fsf-accent);font-weight:600}" +
  ".fsf-mail.is-copied .fsf-mail-tag .is-idle{opacity:0;translate:0 -.6em}" +
  ".fsf-mail.is-copied .fsf-mail-tag .is-done{opacity:1;translate:0 0}" +
  ".fsf-mail.is-copied .fsf-mail-ico{animation:fsf-boing .6s " + EASE_BOUNCE + "}" +
  ".fsf-links{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem 1.6rem;margin:0;padding:0;list-style:none}" +
  ".fsf-link{position:relative;display:inline-block;padding:.25em 0;color:var(--fsf-muted);transition:color .25s}" +
  ".fsf-link:hover,.fsf-link:focus-visible{color:var(--fsf-ink)}" +
  ".fsf-link:focus-visible{outline:2px solid var(--fsf-accent);outline-offset:3px;border-radius:2px}" +
  ".fsf-link svg{position:absolute;left:0;bottom:-.2em;width:100%;height:.42em;max-width:none;overflow:visible;pointer-events:none}" +
  ".fsf-link path{fill:none;stroke:var(--fsf-accent);stroke-width:1.6;stroke-linecap:round;stroke-dasharray:1 2;stroke-dashoffset:1;transition:stroke-dashoffset .5s " + EASE_OUT + "}" +
  ".fsf-link:hover path,.fsf-link:focus-visible path{stroke-dashoffset:0}" +
  ".fsf-bar{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:0 clamp(1rem,4cqw,3rem);padding:1.1rem 0 1.4rem;border-top:1px solid color-mix(in oklab,var(--fsf-ink) 12%,transparent);font-size:.8125rem;color:var(--fsf-muted)}" +
  ".fsf-bar p{margin:0}" +
  ".fsf-top{display:inline-flex;align-items:center;gap:.5em;padding:.3em 0;transition:color .25s}" +
  ".fsf-top:hover,.fsf-top:focus-visible{color:var(--fsf-ink)}" +
  ".fsf-top:focus-visible{outline:2px solid var(--fsf-accent);outline-offset:3px;border-radius:2px}" +
  ".fsf-top i{position:relative;display:grid;place-items:center;width:1.9em;height:1.9em;border-radius:50%;border:1px solid color-mix(in oklab,var(--fsf-ink) 16%,transparent);overflow:hidden;font-style:normal}" +
  ".fsf-top svg{width:.9em;height:.9em;max-width:none}" +
  ".fsf-top:hover svg{animation:fsf-hop .55s " + EASE_OUT + "}" +
  // entrance: nothing shows until the section is seen
  ".fsf:not([data-in]) .fsf-ch,.fsf:not([data-in]) .fsf-p,.fsf:not([data-in]) .fsf-dot,.fsf:not([data-in]) .fsf-stk-in,.fsf:not([data-in]) .fsf-sub span,.fsf:not([data-in]) .fsf-rise{opacity:0}" +
  ".fsf[data-in] .fsf-ch{animation:fsf-rise .9s " + EASE_OUT + " both;animation-delay:calc(var(--i) * 38ms)}" +
  ".fsf[data-in] .fsf-p{animation:fsf-draw var(--dur) cubic-bezier(.45,.05,.4,1) both;animation-delay:calc(var(--base) + var(--d))}" +
  ".fsf[data-in] .fsf-dot{animation:fsf-dot .45s " + EASE_BOUNCE + " both;animation-delay:calc(var(--base) + var(--d))}" +
  ".fsf[data-in] .fsf-script svg{animation:fsf-pop .6s " + EASE_BOUNCE + " both;animation-delay:calc(var(--base) + var(--total))}" +
  ".fsf-script[data-out] .fsf-p{animation:fsf-erase .34s cubic-bezier(.55,0,.8,.2) both;animation-delay:calc(var(--d) * .18)}" +
  ".fsf-script[data-out] .fsf-dot{animation:fsf-undot .25s ease-in both}" +
  ".fsf[data-in] .fsf-stk-in{animation:fsf-slap .75s " + EASE_OUT + " both;animation-delay:var(--sd)}" +
  ".fsf[data-in] .fsf-sub span{animation:fsf-up .8s " + EASE_OUT + " both;animation-delay:calc(1.05s + var(--i) * 110ms)}" +
  ".fsf[data-in] .fsf-rise{animation:fsf-up .8s " + EASE_OUT + " both;animation-delay:calc(1.4s + var(--i) * 120ms)}" +
  "@keyframes fsf-rise{from{opacity:0;transform:translateY(.55em) rotate(9deg);filter:blur(.04em)}55%{opacity:1}to{opacity:1;transform:none;filter:none}}" +
  "@keyframes fsf-draw{from{stroke-dashoffset:1;opacity:0}1%{opacity:1}to{stroke-dashoffset:0;opacity:1}}" +
  "@keyframes fsf-erase{from{stroke-dashoffset:0}to{stroke-dashoffset:-1}}" +
  "@keyframes fsf-dot{from{transform:scale(0)}to{transform:none}}" +
  "@keyframes fsf-undot{to{transform:scale(0)}}" +
  "@keyframes fsf-pop{0%,100%{transform:none}35%{transform:scale(1.05,.93)}65%{transform:scale(.98,1.03)}}" +
  "@keyframes fsf-wig{0%,100%{transform:none}30%{transform:translateY(-14px) rotate(-5deg)}60%{transform:translateY(3px) rotate(2deg)}}" +
  "@keyframes fsf-slap{0%{opacity:0;transform:translateY(-.5em) scale(1.75) rotate(var(--spin))}45%{opacity:1}60%{transform:scale(.9) rotate(0deg)}80%{transform:scale(1.04)}100%{opacity:1;transform:none}}" +
  "@keyframes fsf-bob{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-.035em) rotate(1.6deg)}}" +
  "@keyframes fsf-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}" +
  "@keyframes fsf-boing{0%{transform:none}35%{transform:scale(1.25) rotate(-12deg)}70%{transform:scale(.92)}100%{transform:none}}" +
  "@keyframes fsf-hop{0%{transform:none}45%{transform:translateY(-160%)}46%{transform:translateY(160%)}100%{transform:none}}" +
  "@container (max-width: 640px){" +
  ".fsf-cluster{font-size:10.4cqw}" +
  ".fsf-stage{padding:26cqw 4cqw 20cqw}" +
  ".fsf-contact{flex-direction:column;gap:1.1rem}" +
  ".fsf-bar{flex-direction:column-reverse;gap:.4rem;text-align:center}" +
  "}" +
  "@media (prefers-reduced-motion: reduce){" +
  ".fsf *,.fsf *::after{animation:none !important;transition:none !important}" +
  "}"

// ---- component ---------------------------------------------------------------

type Motion = {
  ox: number
  oy: number
  x: number
  y: number
  vx: number
  vy: number
  tilt: number
  lift: number
  liftT: number
  drag: boolean
  moved: boolean
  sx: number
  sy: number
  ox0: number
  oy0: number
  min: [number, number]
  max: [number, number]
}

const newMotion = (): Motion => ({ ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, tilt: 0, lift: 0, liftT: 0, drag: false, moved: false, sx: 0, sy: 0, ox0: 0, oy0: 0, min: [-1, -1], max: [1, 1] })

const SCRIPT_UNIT = 0.0052 // em per glyph unit
const SCRIPT_PAD_L = 70
const SCRIPT_PAD_R = 90

const fmt = (n: number) => +n.toFixed(4) + "em"

export default function FruitSticker({
  as = "footer",
  headingTag = "h2",
  headline = "Thank You,",
  farewells = ["bye!", "ciao!", "later!", "adios!", "cheers!"],
  lines = ["Don’t forget to contact me.", "Hope to see you later!"],
  children,
  email = "hello@noravale.studio",
  links = DEFAULT_LINKS,
  name = "Nora Vale",
  year = 2026,
  stickers = DEFAULT_STICKERS,
  cycle = FRUITS,
  accent = "#ff5a3c",
  ink = "var(--color-foreground, #141210)",
  muted = "var(--color-muted-foreground, #6f6a63)",
  background = "var(--color-background, #f4f1ea)",
  fontSans = '"Satoshi","General Sans","Plus Jakarta Sans","Manrope",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  height = "100svh",
  onFarewell,
  onStickerSwap,
  onCopy,
  onLinkClick,
  onBackToTop,
  className = "",
}: FruitStickerProps) {
  const Root = as
  const Heading = headingTag
  const rootRef = useRef<HTMLElement>(null)
  const clusterRef = useRef<HTMLDivElement>(null)
  const stickerEls = useRef<(HTMLDivElement | null)[]>([])
  const bodyEls = useRef<(HTMLButtonElement | null)[]>([])

  const words = farewells.length ? farewells : ["bye!"]
  const [inView, setInView] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [erasing, setErasing] = useState(false)
  const [redraw, setRedraw] = useState(false)
  // Swapped fruit per sticker (unset: the sticker's own fruit).
  const [swapped, setSwapped] = useState<Record<number, Fruit>>({})
  const fruits = stickers.map((s, i) => swapped[i] ?? s.fruit)
  const [topSticker, setTopSticker] = useState(-1)
  const [dragging, setDragging] = useState(-1)
  const [copied, setCopied] = useState(false)

  const word = words[wordIndex % words.length]

  // Script geometry. The slot hugs the word on screen and glides to the next one's width while it's being written,
  // so the line re-centres smoothly.
  const script = useMemo(() => {
    const laid = layoutWord(word)
    return { ...timeWord(laid.glyphs), width: laid.width }
  }, [word])

  const anim = useRef({
    raf: 0,
    reduced: false,
    px: 0,
    py: 0,
    tpx: 0,
    tpy: 0,
    s: [] as Motion[],
  })
  // One motion record per sticker (made when first needed, outside render).
  const motion = (i: number) => (anim.current.s[i] ??= newMotion())

  // One frame of the sticker springs; keeps asking for frames while anything still moves.
  const step = useCallback(() => {
    const tick = () => {
    const a = anim.current
    const cluster = clusterRef.current
    if (!cluster) return
    const W = cluster.offsetWidth || 1
    let busy = false
    if (!a.reduced) {
      a.px += (a.tpx - a.px) * 0.07
      a.py += (a.tpy - a.py) * 0.07
      if (Math.abs(a.tpx - a.px) > 0.001 || Math.abs(a.tpy - a.py) > 0.001) busy = true
    }
    stickerEls.current.forEach((el, i) => {
      if (!el) return
      const s = (a.s[i] ??= newMotion())
      const depth = 0.6 + ((i * 37) % 10) / 12
      const tx = s.ox * W + (s.drag ? 0 : a.px * 10 * depth)
      const ty = s.oy * W + (s.drag ? 0 : a.py * 7 * depth)
      if (a.reduced) {
        s.x = tx
        s.y = ty
        s.vx = s.vy = 0
        s.tilt = 0
        s.lift = s.liftT
      } else {
        const k = s.drag ? 0.42 : 0.16
        const damp = s.drag ? 0.55 : 0.66
        ;[s.x, s.vx] = spring(s.x, s.vx, tx, k, damp)
        ;[s.y, s.vy] = spring(s.y, s.vy, ty, k, damp)
        const tiltT = Math.max(-16, Math.min(16, s.vx * 1.1))
        s.tilt += (tiltT - s.tilt) * 0.2
        s.lift += (s.liftT - s.lift) * 0.2
        if (Math.abs(tx - s.x) > 0.05 || Math.abs(ty - s.y) > 0.05 || Math.abs(s.vx) > 0.02 || Math.abs(s.vy) > 0.02 || Math.abs(s.tilt) > 0.02 || Math.abs(s.liftT - s.lift) > 0.002) busy = true
      }
      el.style.transform = "translate3d(" + s.x.toFixed(2) + "px," + s.y.toFixed(2) + "px,0) rotate(" + s.tilt.toFixed(2) + "deg) scale(" + (1 + s.lift * 0.08).toFixed(4) + ")"
      el.style.setProperty("--lift", s.lift.toFixed(3))
    })
    a.raf = busy ? requestAnimationFrame(tick) : 0
    }
    tick()
  }, [])

  const kick = useCallback(() => {
    if (!anim.current.raf) anim.current.raf = requestAnimationFrame(step)
  }, [step])

  // Reduced motion, the entrance, and keeping offsets proportional on resize.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const a = anim.current
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    a.reduced = mq.matches
    const onMq = () => {
      a.reduced = mq.matches
      kick()
    }
    mq.addEventListener("change", onMq)

    let io: IntersectionObserver | undefined
    let frame = 0
    if (a.reduced || typeof IntersectionObserver === "undefined") frame = requestAnimationFrame(() => setInView(true))
    else {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setInView(true)
            io?.disconnect()
          }
        },
        { threshold: 0.25 },
      )
      io.observe(root)
    }
    const ro = new ResizeObserver(() => kick())
    if (clusterRef.current) ro.observe(clusterRef.current)
    return () => {
      mq.removeEventListener("change", onMq)
      io?.disconnect()
      ro.disconnect()
      cancelAnimationFrame(frame)
      cancelAnimationFrame(a.raf)
      a.raf = 0
    }
  }, [kick])

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(id)
  }, [copied])

  const eraseTimer = useRef(0)
  useEffect(() => () => clearTimeout(eraseTimer.current), [])

  const nextFarewell = () => {
    if (erasing) return
    const n = (wordIndex + 1) % words.length
    const go = () => {
      setWordIndex(n)
      setErasing(false)
      setRedraw(true)
      onFarewell?.(n, words[n])
    }
    if (anim.current.reduced || !inView) go()
    else {
      setErasing(true)
      eraseTimer.current = window.setTimeout(go, 420)
    }
  }

  // ---- stickers ----

  const swap = (i: number) => {
    const current = fruits[i]
    let next = current
    for (let k = 1; k <= cycle.length; k++) {
      const f = cycle[(Math.max(0, cycle.indexOf(current)) + k) % cycle.length]
      if (!fruits.includes(f)) {
        next = f
        break
      }
    }
    const apply = () => {
      setSwapped((m) => ({ ...m, [i]: next }))
      onStickerSwap?.(i, next)
    }
    const body = bodyEls.current[i]
    if (anim.current.reduced || !body?.animate) return apply()
    const half = body.animate([{ transform: "perspective(30em) rotateY(0deg)" }, { transform: "perspective(30em) rotateY(90deg) scale(1.06)" }], {
      duration: 170,
      easing: "cubic-bezier(.5,0,.9,.6)",
      fill: "forwards",
    })
    half.onfinish = () => {
      apply()
      half.cancel()
      body.animate(
        [
          { transform: "perspective(30em) rotateY(-90deg) scale(1.06)" },
          { transform: "perspective(30em) rotateY(14deg)", offset: 0.65 },
          { transform: "perspective(30em) rotateY(0deg)" },
        ],
        { duration: 480, easing: "cubic-bezier(.2,.8,.3,1)" },
      )
    }
  }

  const slap = (i: number) => {
    const body = bodyEls.current[i]
    if (anim.current.reduced || !body?.animate) return
    body.animate(
      [{ transform: "scale(1)" }, { transform: "scale(.9,.86)", offset: 0.3 }, { transform: "scale(1.04)", offset: 0.65 }, { transform: "scale(1)" }],
      { duration: 460, easing: "cubic-bezier(.3,.7,.4,1)" },
    )
  }

  const bounds = (i: number) => {
    const root = rootRef.current
    const cluster = clusterRef.current
    const s = motion(i)
    if (!root || !cluster) return
    const r = root.getBoundingClientRect()
    const c = cluster.getBoundingClientRect()
    const W = c.width || 1
    const spec = stickers[i]
    const hx = c.left + (spec.x / 100) * c.width
    const hy = c.top + (spec.y / 100) * c.height
    const pad = 24
    s.min = [(r.left + pad - hx) / W, (r.top + pad - hy) / W]
    s.max = [(r.right - pad - hx) / W, (r.bottom - pad - hy) / W]
  }

  const onStickerDown = (e: ReactPointerEvent<HTMLButtonElement>, i: number) => {
    if (e.button !== 0) return
    const s = motion(i)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    bounds(i)
    s.drag = true
    s.moved = false
    s.sx = e.clientX
    s.sy = e.clientY
    s.ox0 = s.ox
    s.oy0 = s.oy
    s.liftT = 1
    setTopSticker(i)
    setDragging(i)
    kick()
  }
  const onStickerMove = (e: ReactPointerEvent<HTMLButtonElement>, i: number) => {
    const s = motion(i)
    if (!s.drag) return
    const W = clusterRef.current?.offsetWidth || 1
    const dx = e.clientX - s.sx
    const dy = e.clientY - s.sy
    if (!s.moved && Math.hypot(dx, dy) > 5) s.moved = true
    if (!s.moved) return
    s.ox = clampOffset(s.ox0 + dx / W, s.min[0], s.max[0])
    s.oy = clampOffset(s.oy0 + dy / W, s.min[1], s.max[1])
    kick()
  }
  const onStickerUp = (e: ReactPointerEvent<HTMLButtonElement>, i: number) => {
    const s = motion(i)
    if (!s.drag) return
    s.drag = false
    s.liftT = 0
    setDragging(-1)
    if (e.type === "pointerup") {
      if (s.moved) slap(i)
      else swap(i)
    }
    kick()
  }
  // Keyboard: Enter/Space fire a click with detail 0; pointers already swapped on pointerup.
  const onStickerClick = (e: ReactMouseEvent<HTMLButtonElement>, i: number) => {
    if (e.detail === 0) swap(i)
  }
  const onStickerKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.shiftKey ? 0.05 : 0.015
    const move: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }
    const m = move[e.key]
    if (!m) return
    e.preventDefault()
    const s = motion(i)
    bounds(i)
    s.ox = clampOffset(s.ox + m[0], s.min[0], s.max[0])
    s.oy = clampOffset(s.oy + m[1], s.min[1], s.max[1])
    setTopSticker(i)
    kick()
  }
  // Double-click the empty stage: every sticker springs home. The second press mustn't start a text selection.
  const noSelect = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.detail > 1 && !(e.target as HTMLElement).closest("button,a")) e.preventDefault()
  }
  const tidy = (e: ReactMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button,a")) return
    anim.current.s.forEach((s) => {
      s.ox = 0
      s.oy = 0
    })
    kick()
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    anim.current.tpx = ((e.clientX - r.left) / r.width) * 2 - 1
    anim.current.tpy = ((e.clientY - r.top) / r.height) * 2 - 1
    kick()
  }
  const onPointerLeave = () => {
    anim.current.tpx = 0
    anim.current.tpy = 0
    kick()
  }

  // ---- contact ----

  const copy = () => {
    const done = () => {
      setCopied(true)
      onCopy?.(email)
    }
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined
    if (!clip?.writeText) {
      window.location.href = "mailto:" + email
      return
    }
    clip.writeText(email).then(done, () => {
      window.location.href = "mailto:" + email
    })
  }

  const toTop = () => {
    if (onBackToTop) return onBackToTop()
    window.scrollTo({ top: 0, behavior: anim.current.reduced ? "auto" : "smooth" })
  }

  const link = (l: FooterLink) => (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!l.href || l.href === "#") e.preventDefault()
    onLinkClick?.(l.label, l.href)
  }

  // ---- render ----

  const rootStyle = {
    "--fsf-accent": accent,
    "--fsf-shade": "color-mix(in oklab, " + accent + " 66%, #3b0b02)",
    "--fsf-ink": ink,
    "--fsf-muted": muted,
    "--fsf-bg": background,
    "--fsf-font": fontSans,
    minHeight: height,
  } as CSSProperties

  const slotW = script.width * SCRIPT_UNIT
  const vbW = script.width + SCRIPT_PAD_L + SCRIPT_PAD_R
  const vbH = SCRIPT_BOTTOM - SCRIPT_TOP
  const svgStyle = {
    left: fmt(-SCRIPT_PAD_L * SCRIPT_UNIT),
    top: fmt(0.8 + SCRIPT_TOP * SCRIPT_UNIT),
    width: fmt(vbW * SCRIPT_UNIT),
    height: fmt(vbH * SCRIPT_UNIT),
  } as CSSProperties

  const layer = (kind: "s" | "m" | "h") => {
    const off = kind === "s" ? "translate(6,8)" : kind === "h" ? "translate(-5,-6)" : ""
    const w = kind === "h" ? 7 : SCRIPT_STROKE
    return (
      <g className={"fsf-" + kind} transform={off}>
        {script.glyphs.map((g, gi) => (
          <g key={gi} transform={"translate(" + g.x + ",0)"}>
            <g className="fsf-g" style={{ "--gi": gi } as CSSProperties}>
              {g.strokes.map((s, si) => (
                <path
                  key={si}
                  className="fsf-p"
                  d={s.d}
                  pathLength={1}
                  strokeWidth={w}
                  style={{ "--d": (s.delay + (kind === "s" ? 0.06 : kind === "h" ? 0.1 : 0)).toFixed(3) + "s", "--dur": s.dur.toFixed(3) + "s" } as CSSProperties}
                />
              ))}
              {g.dots.map((p, di) => (
                <circle key={"d" + di} className="fsf-dot" cx={p.x} cy={p.y} r={kind === "h" ? 4 : SCRIPT_STROKE / 2} style={{ "--d": p.delay.toFixed(3) + "s" } as CSSProperties} />
              ))}
            </g>
          </g>
        ))}
      </g>
    )
  }

  const chars = [...headline].reduce<{ out: ReactNode[]; n: number }>(
    (acc, ch, i) => {
      acc.out.push(
        <span key={i} className="fsf-ch" style={{ "--i": acc.n } as CSSProperties}>
          {ch === " " ? "\u00a0" : ch /* a non-breaking space: a plain one collapses in an inline-block */}
        </span>,
      )
      if (ch !== " ") acc.n++
      return acc
    },
    { out: [], n: 0 },
  ).out

  const sticker = (spec: StickerSpec, i: number) => {
    const fruit = fruits[i] ?? spec.fruit
    const h = spec.size ?? 0.8
    const w = spec.shape === "oval" ? h * 1.3 : h
    const paper = fruit === spec.fruit && spec.color ? spec.color : PAPER[fruit]
    const cls = "fsf-stk" + (spec.behind && topSticker !== i ? " is-behind" : "") + (topSticker === i ? " is-top" : "") + (dragging === i ? " is-drag" : "")
    return (
      <div
        key={i}
        ref={(el) => {
          stickerEls.current[i] = el
        }}
        className={cls}
        style={{ "--x": spec.x + "%", "--y": spec.y + "%", "--w": w + "em", "--h": h + "em" } as CSSProperties}
      >
        <div className="fsf-stk-in" style={{ "--sd": (0.7 + i * 0.13).toFixed(2) + "s", "--spin": (i % 2 ? 24 : -24) + "deg" } as CSSProperties}>
          <div className="fsf-stk-bob" style={{ "--bd": -i * 1.7 + "s" } as CSSProperties}>
            <button
              type="button"
              ref={(el) => {
                bodyEls.current[i] = el
              }}
              className="fsf-stk-body"
              style={{ "--c": paper, "--r": (spec.rotate ?? 0) + "deg", "--f": h * 0.86 + "em" } as CSSProperties}
              aria-label={NAMES[fruit] + " sticker. Press Enter to swap the fruit, arrow keys to move it."}
              onPointerDown={(e) => onStickerDown(e, i)}
              onPointerMove={(e) => onStickerMove(e, i)}
              onPointerUp={(e) => onStickerUp(e, i)}
              onPointerCancel={(e) => onStickerUp(e, i)}
              onClick={(e) => onStickerClick(e, i)}
              onKeyDown={(e) => onStickerKey(e, i)}
            >
              <svg className="fsf-fruit" viewBox="-50 -50 100 100" aria-hidden="true">
                {ART[fruit]}
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Root
      ref={rootRef as React.RefObject<HTMLElement>}
      className={("fsf " + className).trim()}
      style={rootStyle}
      data-in={inView ? "" : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <style>{CSS}</style>
      <div className="fsf-stage" onMouseDown={noSelect} onDoubleClick={tidy}>
        <div ref={clusterRef} className="fsf-cluster">
          {stickers.map((s, i) => (s.behind ? sticker(s, i) : null))}
          <Heading className="fsf-head">
            <span className="fsf-sr">{headline + " " + word}</span>
            <span className="fsf-line" aria-hidden="true">
              {chars}
            </span>
            <button
              type="button"
              className="fsf-script"
              style={{ width: fmt(slotW) }}
              data-out={erasing ? "" : undefined}
              onClick={nextFarewell}
              aria-label={"Show another word (now: " + word + ")"}
            >
              <svg
                key={wordIndex}
                viewBox={-SCRIPT_PAD_L + " " + SCRIPT_TOP + " " + vbW + " " + vbH}
                style={{ ...svgStyle, "--base": redraw ? "0s" : "0.45s", "--total": script.total.toFixed(3) + "s" } as CSSProperties}
                aria-hidden="true"
              >
                <g transform="rotate(-6 0 0) skewX(-10)">
                  {layer("s")}
                  {layer("m")}
                  {layer("h")}
                </g>
              </svg>
            </button>
          </Heading>
          <p className="fsf-sub">
            {lines.map((l, i) => (
              <span key={i} style={{ "--i": i } as CSSProperties}>
                {l}
              </span>
            ))}
          </p>
          {stickers.map((s, i) => (s.behind ? null : sticker(s, i)))}
        </div>
        {/* Under the headline block, so the stickers' places (in % of that block) don't depend on it. */}
        {children && <div className="fsf-extra fsf-rise" style={{ "--i": 0 } as CSSProperties}>{children}</div>}
      </div>

      {(email || links.length > 0) && (
        <div className="fsf-contact">
          {email && (
            <button type="button" className={"fsf-mail fsf-rise" + (copied ? " is-copied" : "")} style={{ "--i": 0 } as CSSProperties} onClick={copy}>
              <span className="fsf-mail-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 7.5C3.5 6.4 4.4 5.5 5.5 5.5H18.5C19.6 5.5 20.5 6.4 20.5 7.5V16.5C20.5 17.6 19.6 18.5 18.5 18.5H5.5C4.4 18.5 3.5 17.6 3.5 16.5Z" />
                  <path d="M4.5 7L12 12.5L19.5 7" />
                </svg>
              </span>
              <span>{email}</span>
              <span className="fsf-mail-tag" aria-hidden="true">
                <span className="is-idle">copy</span>
                <span className="is-done">copied!</span>
              </span>
              <span className="fsf-sr" role="status">
                {copied ? "Email address copied" : ""}
              </span>
            </button>
          )}
          {links.length > 0 && (
            <ul className="fsf-links fsf-rise" style={{ "--i": 1 } as CSSProperties}>
              {links.map((l) => (
                <li key={l.label}>
                  <a className="fsf-link" href={l.href || "#"} onClick={link(l)}>
                    {l.label}
                    <svg viewBox="0 0 40 6" preserveAspectRatio="none" aria-hidden="true">
                      <path pathLength={1} d="M1,3C4,0.5 6,0.5 9,3S14,5.5 17,3S22,0.5 25,3S30,5.5 33,3S37,0.5 39,2.5" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {name && (
        <div className="fsf-bar fsf-rise" style={{ "--i": 2 } as CSSProperties}>
          <p>{"© " + year + " " + name}</p>
          <button type="button" className="fsf-top" onClick={toTop}>
            Back to top
            <i aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 13V3M3.5 7.5L8 3L12.5 7.5" />
              </svg>
            </i>
          </button>
        </div>
      )}
    </Root>
  )
}
