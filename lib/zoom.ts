import type { Cue } from "@/db";
import { wordTimes } from "@/lib/captionStyles";
import { pickKeywords } from "@/lib/keywords";

/** Auto zoom: how far the video punches in on each caption's key word, and how ("punch" cuts in, "smooth" eases). */
export type Zoom = { strength: number; style: "punch" | "smooth" };
export type Moment = { s: number; e: number };

const HOLD = 0.9, GAP = 1.2, MAX = 400;
const ramp = (z: Zoom) => (z.style === "smooth" ? 0.22 : 0.04);

/**
 * When the video zooms: on each caption's key word (one the user picked out with a colour or look first, else the
 * keyword picker's), held ~0.9 s (never past the caption), at least 1.2 s after the last zoom ended.
 */
export function zoomMoments(cues: Cue[], line: "ta" | "en"): Moment[] {
  const out: Moment[] = [];
  for (const c of cues) {
    const text = c[line] || c.ta || c.en;
    const ln = c[line] ? line : c.ta ? "ta" : "en";
    const words = wordTimes(text, c.start, c.end, ln === "en" ? c.we : c.w);
    if (!words.length) continue;
    const marked = (ln === "en" ? [c.wce, c.wfe] : [c.wc, c.wf]).flatMap((a) => (a ?? []).map((x, j) => (x ? j : -1))).filter((j) => j >= 0 && j < words.length);
    const j = marked.length ? Math.min(...marked) : pickKeywords(words.map((w) => w.w))[0];
    if (j === undefined) continue;
    const s = words[j].s, e = Math.min(c.end, s + HOLD);
    if (e - s < 0.25 || (out.length && s < out[out.length - 1].e + GAP)) continue;
    out.push({ s, e });
    if (out.length >= MAX) break;
  }
  return out;
}

/** How much the video is zoomed at time t (1 = not at all): eased in and out at the moment's edges. */
export function zoomAt(t: number, moments: Moment[], z: Zoom) {
  const r = ramp(z);
  for (const m of moments) {
    if (t < m.s || t > m.e) continue;
    return 1 + (z.strength - 1) * Math.min(1, (t - m.s) / r, (m.e - t) / r);
  }
  return 1;
}

/** The same as an ffmpeg expression of t (for the scale filter's eval=frame), so the MP4 zooms exactly as the preview. */
export function zoomExpr(moments: Moment[], z: Zoom) {
  if (!moments.length) return "1";
  const r = ramp(z), f = (n: number) => n.toFixed(3);
  const terms = moments.map((m) => `between(t,${f(m.s)},${f(m.e)})*min(1,min((t-${f(m.s)})/${r},(${f(m.e)}-t)/${r}))`);
  return `1+${f(z.strength - 1)}*(${terms.join("+")})`;
}

/** A zoom setting from a saved project, kept in range. */
export function zoomOf(v: unknown): Zoom | undefined {
  const o = v as Partial<Zoom> | null | undefined;
  if (!o || typeof o !== "object" || typeof o.strength !== "number" || !Number.isFinite(o.strength)) return undefined;
  return { strength: Math.min(1.4, Math.max(1.03, o.strength)), style: o.style === "smooth" ? "smooth" : "punch" };
}
