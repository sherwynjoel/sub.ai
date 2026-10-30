/**
 * Editing operations on captions for the web editor (pure, so they're tested on their own): split, merge, insert,
 * and word-level edits that keep each line's word times (w / we) and word colours (wc / wce) in step with its words.
 */
import type { Cue } from "@/db/schema";
import { wordTimes } from "@/lib/captionStyles";

export const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean);
const TIMES = { ta: "w", en: "we" } as const;
const COLORS = { ta: "wc", en: "wce" } as const;

/** The starts of a line's words: the stored ones, else shared by length. */
export function startsOf(c: Cue, line: "ta" | "en") {
  return wordTimes(c[line], c.start, c.end, c[TIMES[line]]).map((w) => w.s);
}

/** Split a caption at time t (between its words). Undefined when there's nothing to split. */
export function splitCue(c: Cue, t: number): [Cue, Cue] | undefined {
  if (t <= c.start + 0.1 || t >= c.end - 0.1) return undefined;
  const ta = wordsOf(c.ta), en = wordsOf(c.en);
  const main = ta.length ? "ta" : "en";
  const words = main === "ta" ? ta : en;
  if (words.length < 2) return undefined;
  const starts = startsOf(c, main);
  // The first word said at or after t starts the second half (at least one word on each side).
  let k = starts.findIndex((s) => s >= t);
  if (k < 0) k = words.length - 1;
  k = Math.max(1, Math.min(words.length - 1, k));
  const at = starts[k];
  const share = k / words.length;
  const half = (line: "ta" | "en", n: number) => {
    const ws = wordsOf(c[line]);
    const cut = line === main ? n : Math.round(ws.length * share);
    return { a: ws.slice(0, cut), b: ws.slice(cut), cut };
  };
  const a: Cue = { start: c.start, end: at, ta: "", en: "" }, b: Cue = { start: at, end: c.end, ta: "", en: "" };
  for (const line of ["ta", "en"] as const) {
    const h = half(line, k);
    a[line] = h.a.join(" ");
    b[line] = h.b.join(" ");
    const tk = TIMES[line], ck = COLORS[line];
    const times = c[tk];
    if (times && times.length === h.a.length + h.b.length) {
      // English words split by share may fall either side of the cut: keep them inside their half.
      a[tk] = times.slice(0, h.cut).map((x) => Math.min(x, at - 0.01));
      b[tk] = times.slice(h.cut).map((x) => Math.max(x, at));
    }
    const colors = c[ck];
    if (colors && colors.length === h.a.length + h.b.length) { a[ck] = colors.slice(0, h.cut); b[ck] = colors.slice(h.cut); }
  }
  if (c.style) { a.style = { ...c.style }; b.style = { ...c.style }; }
  return [a, b];
}

/** One caption from two neighbours: text and word times joined, the first one's style kept. */
export function mergeCues(a: Cue, b: Cue): Cue {
  const c: Cue = { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end), ta: [a.ta, b.ta].filter(Boolean).join(" "), en: [a.en, b.en].filter(Boolean).join(" ") };
  for (const line of ["ta", "en"] as const) {
    const tk = TIMES[line], ck = COLORS[line];
    if (c[line]) c[tk] = [...startsOf(a, line).slice(0, wordsOf(a[line]).length), ...startsOf(b, line).slice(0, wordsOf(b[line]).length)];
    if (a[ck] || b[ck]) c[ck] = [...(a[ck] ?? wordsOf(a[line]).map(() => null)), ...(b[ck] ?? wordsOf(b[line]).map(() => null))];
  }
  const style = a.style ?? b.style;
  if (style) c.style = { ...style };
  return c;
}

/** A new empty caption at time t, in the gap there (or after the caption under t), up to 2 s long. */
export function insertAt(cues: Cue[], t: number, duration: number): { cues: Cue[]; index: number } {
  // Inside a caption (captions usually touch): at its nearer edge, between it and its neighbour.
  const k = cues.findIndex((c) => t >= c.start && t < c.end);
  if (k >= 0) {
    const r = insertBetween(cues, t - cues[k].start < cues[k].end - t ? k - 1 : k, duration);
    if (r.index >= 0) return r;
  }
  let i = cues.findIndex((c) => c.start > t);
  if (i < 0) i = cues.length;
  const prev = cues[i - 1], next = cues[i];
  let start = Math.max(t, prev ? prev.end : 0);
  const limit = next ? next.start : duration > 0 ? duration : start + 2; // not past the end of the video
  if (limit - start < 0.3) start = Math.max(prev ? prev.end : 0, limit - 0.3); // squeeze into a tight gap
  const c: Cue = { start, end: Math.min(limit, start + 2), ta: "", en: "" };
  if (c.end - c.start < 0.2) return { cues, index: -1 };
  return { cues: [...cues.slice(0, i), c, ...cues.slice(i)], index: i };
}

/** Shortest a caption is left when a new one is put in beside it, and the new one's length when there's room. */
const KEEP = 0.5, NEW = 1.2;

/** Word times (and their caption's) moved from one span to another, keeping where each falls in it. */
const respan = (c: Cue, start: number, end: number): Cue => {
  const k = (end - start) / Math.max(0.001, c.end - c.start), m = (x: number) => Math.round((start + (x - c.start) * k) * 1000) / 1000;
  return { ...c, start, end, ...(c.w ? { w: c.w.map(m) } : {}), ...(c.we ? { we: c.we.map(m) } : {}) };
};

/**
 * An empty caption between caption j and the next (j = -1: before the first; the last: after it), with room made
 * by ending caption j earlier and starting the next later, each keeping at least KEEP seconds (and its words, in
 * proportion). Uses any gap there already is. index -1 when there's no room (both neighbours already short).
 */
export function insertBetween(cues: Cue[], j: number, duration: number): { cues: Cue[]; index: number } {
  const prev = cues[j], next = cues[j + 1];
  const a0 = prev ? prev.end : 0, b0 = next ? next.start : duration > 0 ? duration : a0 + NEW;
  const gap = Math.max(0, b0 - a0), want = Math.max(0, NEW - gap);
  if (!want) { // room already: a caption of the usual length at the start of the free time
    const out = cues.slice();
    out.splice(j + 1, 0, { start: a0, end: Math.round((a0 + NEW) * 1000) / 1000, ta: "", en: "" });
    return { cues: out, index: j + 1 };
  }
  const fromPrev = prev ? Math.max(0, prev.end - prev.start - KEEP) : 0, fromNext = next ? Math.max(0, next.end - next.start - KEEP) : 0;
  const give = Math.min(want - Math.min(want / 2, fromPrev), fromNext), take = Math.min(want - give, fromPrev); // the side with room covers what the other can't
  const start = Math.round((a0 - take) * 1000) / 1000, end = Math.round((b0 + give) * 1000) / 1000;
  if (end - start < 0.3) return { cues, index: -1 };
  const out = cues.slice();
  if (prev && take) out[j] = respan(prev, prev.start, start);
  if (next && give) out[j + 1] = respan(next, end, next.end);
  out.splice(j + 1, 0, { start, end, ta: "", en: "" });
  return { cues: out, index: j + 1 };
}

/**
 * Caption i taken out. When it touched the captions on both sides (as one added between them does), they meet in its
 * middle so no gap is left (their words stretched with them); with a gap on either side, it just goes.
 */
export function removeCue(cues: Cue[], i: number): Cue[] {
  const c = cues[i], prev = cues[i - 1], next = cues[i + 1];
  const out = cues.filter((_, j) => j !== i);
  if (!c || !prev || !next || c.start - prev.end > 0.05 || next.start - c.end > 0.05) return out;
  const mid = Math.round(((c.start + c.end) / 2) * 1000) / 1000;
  out[i - 1] = respan(prev, prev.start, mid);
  out[i] = respan(next, mid, next.end);
  return out;
}

/**
 * A line's text changed: word times and colours stay with the words they belong to while the count matches; a word
 * added or removed keeps the times around it (new words share the time of the word they came from).
 */
export function setText(c: Cue, line: "ta" | "en", text: string): Cue {
  const out: Cue = { ...c, [line]: text };
  const tk = TIMES[line], ck = COLORS[line];
  const before = wordsOf(c[line]), after = wordsOf(text);
  if (after.length === before.length) return out;
  const starts = startsOf(c, line);
  if (!after.length) { delete out[tk]; delete out[ck]; return out; }
  // Keep the common head and tail; the changed middle is spread over the time its old words had.
  let h = 0;
  while (h < before.length && h < after.length && before[h] === after[h]) h++;
  let tl = 0;
  while (tl < before.length - h && tl < after.length - h && before[before.length - 1 - tl] === after[after.length - 1 - tl]) tl++;
  const mid = after.length - h - tl, back = before.length - tl; // old words h..back-1 became `mid` new ones
  // Words only added: they share the time of the word after them (the end of the line for the last word).
  const grow = back === h && tl > 0 ? 1 : 0;
  const from = h < before.length ? starts[h] : c.end;
  const to = back + grow < before.length ? starts[back + grow] : c.end;
  const n = mid + grow;
  const times = [...starts.slice(0, h), ...Array.from({ length: n }, (_, k) => from + ((to - from) * k) / Math.max(1, n)), ...starts.slice(back + grow)];
  out[tk] = times.map((x) => Math.min(c.end, Math.max(c.start, x)));
  const colors = c[ck];
  if (colors) {
    const kept = [...colors.slice(0, h), ...Array.from({ length: mid }, () => null), ...colors.slice(before.length - tl)];
    if (kept.some(Boolean)) out[ck] = kept; else delete out[ck];
  }
  return out;
}

/** Change one word of a line (its text, start or colour). */
export function setWord(c: Cue, line: "ta" | "en", j: number, patch: { text?: string; start?: number; color?: string | null }): Cue {
  let out: Cue = { ...c };
  const tk = TIMES[line], ck = COLORS[line];
  const words = wordsOf(c[line]);
  if (patch.start !== undefined) {
    const starts = startsOf(c, line);
    const lo = j ? starts[j - 1] + 0.05 : c.start, hi = j + 1 < starts.length ? starts[j + 1] - 0.05 : c.end - 0.05;
    starts[j] = Math.min(hi, Math.max(lo, patch.start));
    out[tk] = starts;
  }
  if (patch.color !== undefined) {
    const colors = c[ck]?.slice() ?? words.map(() => null);
    colors[j] = patch.color;
    if (colors.some(Boolean)) out[ck] = colors; else delete out[ck];
  }
  if (patch.text !== undefined) {
    const next = words.slice();
    next[j] = patch.text.trim();
    out = setText(out, line, next.filter(Boolean).join(" "));
  }
  return out;
}
