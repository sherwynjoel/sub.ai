import type { Cue } from "@/db/schema";

export type Lang = "ta" | "en" | "both";

function stamp(sec: number, sep: "," | ".") {
  const ms = Math.round(Math.max(0, sec) * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)}${sep}${p(ms % 1000, 3)}`;
}

/** Word indexes after which a line break goes, splitting `words` into up to `n` lines of similar length. */
export function lineBreaks(words: string[], n: number | undefined) {
  const breaks = new Set<number>();
  const lines = Math.min(Math.max(1, Math.round(n ?? 1)), words.length);
  if (lines <= 1) return breaks;
  const target = words.reduce((a, w) => a + w.length + 1, 0) / lines;
  let len = 0, line = 1;
  for (let i = 0; i < words.length - 1 && line < lines; i++) {
    len += words[i].length + 1;
    if (len + (words[i + 1].length + 1) / 2 >= target * line || words.length - 1 - i === lines - line) { breaks.add(i); line++; }
  }
  return breaks;
}

/** `text` laid out on up to `n` lines (newline-separated); no `n` leaves it as is. */
export function breakLines(text: string, n: number | undefined) {
  if (!n) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const brk = lineBreaks(words, n);
  return words.map((w, i) => w + (brk.has(i) ? "\n" : " ")).join("").trim();
}

const text = (c: Cue, lang: Lang, lines?: number) =>
  (lang === "both" ? `${breakLines(c.ta, lines)}\n${breakLines(c.en, lines)}` : breakLines(c[lang], lines)).trim();

export function toSrt(cues: Cue[], lang: Lang, lines?: number) {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${text(c, lang, lines)}\n`).join("\n");
}

export function toVtt(cues: Cue[], lang: Lang, lines?: number) {
  return "WEBVTT\n\n" + cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${text(c, lang, lines)}\n`).join("\n");
}

export function toTxt(cues: Cue[], lang: Lang, lines?: number) {
  return cues.map((c) => text(c, lang, lines)).join("\n");
}

/** Shift chunk-relative cues to absolute time, clamp them inside the chunk, drop empties, sort. */
export function mergeChunks(chunks: { offset: number; duration: number; cues: Cue[] }[]): Cue[] {
  return chunks
    .flatMap(({ offset, duration, cues }) =>
      cues
        .map((c) => ({
          start: offset + Math.min(Math.max(0, c.start), duration),
          end: offset + Math.min(Math.max(0, c.end), duration),
          ta: (c.ta ?? "").trim(),
          en: (c.en ?? "").trim(),
        }))
        .filter((c) => c.end > c.start && (c.ta || c.en)),
    )
    .sort((a, b) => a.start - b.start);
}

/** A timestamped phrase from a speech model. */
export type Piece = { start: number; end: number; text: string };

/**
 * Pair the native-script phrases with the English phrases of the same audio by time. Where the two runs cut
 * differently, the side with more phrases keeps its timing and the other side's words are shared across them by duration.
 */
export function pairChunks(native: Piece[], english: Piece[], tolerance = 0.5): Cue[] {
  // Only one pass was run (or one side heard nothing): nothing to pair.
  if (!english.length) return native.map((p) => ({ start: p.start, end: p.end, ta: p.text, en: "" }));
  if (!native.length) return english.map((p) => ({ start: p.start, end: p.end, ta: "", en: p.text }));
  const cues: Cue[] = [];
  for (let i = 0, j = 0; i < native.length || j < english.length; ) {
    const n: Piece[] = [], e: Piece[] = [];
    // Grow the group until both sides end at the same moment (within the tolerance) or run out.
    do {
      if (j >= english.length || (i < native.length && native[i].end <= english[j].end)) n.push(native[i++]);
      else e.push(english[j++]);
    } while ((i < native.length || j < english.length) && !(n.length && e.length && Math.abs(n.at(-1)!.end - e.at(-1)!.end) < tolerance));
    const [lead, other, nativeLeads] = n.length >= e.length ? [n, e, true] : [e, n, false];
    const shares = divide(other.map((p) => p.text).join(" "), lead.map((p) => p.end - p.start));
    const group = lead.map((p, k) => ({ start: p.start, end: p.end, ta: nativeLeads ? p.text : shares[k], en: nativeLeads ? shares[k] : p.text }));
    // Fewer words than phrases leaves a share empty: fold that cue into its neighbour so every cue has both languages.
    for (let k = 0; k < group.length; k++) {
      const c = group[k], next = group[k + 1], prev = cues.at(-1);
      const join = (a: string, b: string) => [a, b].filter(Boolean).join(" ");
      if (c.ta && c.en) cues.push(c);
      else if (next) { next.start = c.start; next.ta = join(c.ta, next.ta); next.en = join(c.en, next.en); }
      else if (prev) { prev.end = c.end; prev.ta = join(prev.ta, c.ta); prev.en = join(prev.en, c.en); }
      else cues.push(c);
    }
  }
  return cues;
}

/**
 * Split one long transcribed line into subtitle-sized pieces (≤ max chars), breaking at sentence and comma
 * boundaries first, then between words; each piece gets a share of [start, end] by its length.
 */
export function splitLine(text: string, start: number, end: number, max = 42) {
  const words = text.split(/(?<=[.?!,।])\s+/).flatMap((p) => (p.length <= max ? [p] : p.split(/\s+/)));
  const parts: string[] = [];
  for (const w of words) {
    const last = parts.length - 1;
    if (last >= 0 && parts[last].length + 1 + w.length <= max && !/[.?!।]$/.test(parts[last])) parts[last] += " " + w;
    else parts.push(w);
  }
  const total = parts.reduce((n, p) => n + p.length, 0) || 1;
  let t = start;
  return parts.map((p) => {
    const s = t;
    t += ((end - start) * p.length) / total;
    return { start: s, end: t, text: p };
  });
}

/**
 * Readable cues from one native/English pair spanning [start, end] (a speech model's 10–30 s window).
 * Both texts are laid out by length, their sentences paired like windows are, each native sentence cut into
 * ≤ max-char pieces with the English words shared across them, and the pieces timed by length on one clock.
 * shortcut: time inside a window is spread by text length (±1–2 s on slow passages); upgrade to word timestamps if Sarvam adds them.
 */
export function layoutCue(c: Cue, max = 42): Cue[] {
  const sentences = (t: string) => splitLine(t, c.start, c.end, 2000).filter((p) => p.text); // breaks only at sentence ends
  const pieces = pairChunks(sentences(c.ta), sentences(c.en), (c.end - c.start) * 0.15).flatMap((s) => {
    const ps = splitLine(s.ta, 0, 1, max);
    const shares = divide(s.en, ps.map((p) => p.text.length));
    return ps.map((p, k) => ({ ta: p.text, en: shares[k] }));
  });
  const total = pieces.reduce((n, p) => n + p.ta.length, 0) || 1;
  let t = c.start;
  return pieces.map((p) => {
    const s = t;
    t += ((c.end - c.start) * p.ta.length) / total;
    return { start: s, end: t, ta: p.ta, en: p.en };
  });
}

/** Share a translation's words across pieces in proportion to `weights` (the source pieces' lengths). */
export function divide(text: string, weights: number[]) {
  const words = text.split(/\s+/).filter(Boolean);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const out: string[] = [];
  let from = 0, cum = 0;
  weights.forEach((w, k) => {
    cum += w;
    const left = weights.length - 1 - k; // pieces still to fill after this one
    const to = k === weights.length - 1 ? words.length
      : Math.max(from, Math.min(Math.max(Math.round((words.length * cum) / total), from + 1), words.length - left));
    out.push(words.slice(from, to).join(" "));
    from = to;
  });
  return out;
}

/** Move every cue by `by` seconds; cues pushed before 0 are cut at 0 or dropped (a trimmed clip's head). */
export function shiftCues(cues: Cue[], by: number): Cue[] {
  return cues.map((c) => ({ ...c, start: Math.max(0, c.start + by), end: c.end + by })).filter((c) => c.end > 0.05);
}
