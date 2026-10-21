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
          ...(c.anchor ? { anchor: true } : {}),
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
  return pieces.map((p, k) => {
    const s = t;
    t += ((c.end - c.start) * p.ta.length) / total;
    return { start: s, end: t, ta: p.ta, en: p.en, ...(k === 0 ? { anchor: true } : {}) }; // only the first start is the model's
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
    const lo = from + 1, hi = words.length - left;
    let to = k === weights.length - 1 ? words.length : Math.max(from, Math.min(Math.max(Math.round((words.length * cum) / total), lo), hi));
    if (k < weights.length - 1) to = naturalBreak(words, to, lo, hi);
    out.push(words.slice(from, to).join(" "));
    from = to;
  });
  return out;
}

const CLAUSE = /^(and|but|so|because|that|which|who|when|where|if|or|then|while|though|although)$/i;

/**
 * A cut point near `at` (at most 2 words away, inside [lo, hi]) where the English reads naturally: after
 * punctuation first, else before a word that starts a clause. Tamil puts the verb last, so the words of a
 * translation can't follow the Tamil pieces exactly; a cut at a phrase edge reads far better than one mid-phrase.
 */
export function naturalBreak(words: string[], at: number, lo: number, hi: number) {
  let best = at, bestScore = 0;
  for (let d = 0; d <= 2; d++) for (const i of d ? [at - d, at + d] : [at]) {
    if (i < lo || i > hi || i <= 0 || i >= words.length) continue;
    const score = /[,;:.!?]$/.test(words[i - 1]) ? 2 : CLAUSE.test(words[i].replace(/^[("']+/, "")) ? 1 : 0;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return best;
}

/** Move every cue by `by` seconds; cues pushed before 0 are cut at 0 or dropped (a trimmed clip's head). */
export function shiftCues(cues: Cue[], by: number): Cue[] {
  return cues.map((c) => ({ ...c, start: Math.max(0, c.start + by), end: c.end + by })).filter((c) => c.end > 0.05);
}

/**
 * Move the cut between back-to-back cues to the quietest moment near it. Inside a speech model's window the
 * cuts are only estimated by text length, so they can land mid-word up to a second or two off; speech pauses
 * are where a new subtitle should start. `level` is loudness in dB per `frame` seconds (media.loudness).
 * Cuts with a real gap (the model's own timestamps) are kept.
 */
export function snapToPauses(cues: Cue[], level: ArrayLike<number>, frame: number): Cue[] {
  const out = cues.map((c) => ({ ...c }));
  const avg = (f: number) => { // 100 ms average, so one quiet sample between syllables doesn't count as a pause
    let s = 0, n = 0;
    for (let k = f - 2; k <= f + 2; k++) if (k >= 0 && k < level.length) { s += level[k]; n++; }
    return n ? s / n : 0;
  };
  for (let i = 0; i + 1 < out.length; i++) {
    const a = out[i], b = out[i + 1];
    if (b.start - a.end > 0.05 || b.start < a.end - 0.05) continue;
    const t0 = (a.end + b.start) / 2;
    const reach = Math.min(1.2, (t0 - a.start) * 0.5, (b.end - t0) * 0.5);
    if (reach < 2 * frame) continue;
    const f0 = Math.round(t0 / frame), span = Math.round(reach / frame);
    if (f0 >= level.length) break;
    let best = f0, bestCost = avg(f0);
    for (let f = f0 - span; f <= f0 + span; f++) {
      if (f < 0 || f >= level.length) continue;
      const cost = avg(f) + (8 * Math.abs(f - f0)) / span; // up to 8 dB against moving far
      if (cost < bestCost) { best = f; bestCost = cost; }
    }
    a.end = b.start = best * frame;
  }
  return out;
}

/**
 * When each word of a line starts. The speech model only times whole phrases, and sharing a phrase's time by text
 * length drifts after every pause (the first words land, later ones run early). Here the length is shared over the
 * time that has speech in it: loudness frames above the phrase's own quiet level count fully, quiet ones (pauses)
 * barely, and a word that would start in a pause starts where the speech resumes.
 */
export function wordStarts(text: string, start: number, end: number, level: ArrayLike<number>, frame: number): number[] {
  const words = text.split(/\s+/).filter(Boolean);
  const f0 = Math.max(0, Math.round(start / frame)), f1 = Math.min(level.length, Math.round(end / frame));
  const total = words.reduce((n, w) => n + w.length + 1, 0) || 1;
  if (f1 - f0 < 5) { // too short (or past the audio) to measure: by length
    let t = 0;
    return words.map((w) => { const s = start + ((end - start) * t) / total; t += w.length + 1; return s; });
  }
  const avg = (f: number) => { let s = 0, n = 0; for (let k = f - 2; k <= f + 2; k++) if (k >= f0 && k < f1) { s += level[k]; n++; } return s / n; };
  const lv: number[] = [];
  for (let f = f0; f < f1; f++) lv.push(avg(f));
  const sorted = [...lv].sort((a, b) => a - b), lo = sorted[Math.floor(sorted.length * 0.2)], hi = sorted[Math.floor(sorted.length * 0.9)];
  const voiced = lv.map((v) => v > lo + 0.35 * (hi - lo));
  const cum = [0];
  voiced.forEach((v) => cum.push(cum[cum.length - 1] + (v ? 1 : 0.05)));
  const W = cum[cum.length - 1];
  let chars = 0, k = 0, prev = -1;
  return words.map((w) => {
    const target = (W * chars) / total;
    chars += w.length + 1;
    while (k < voiced.length && cum[k + 1] <= target) k++;
    let f = k;
    while (f < voiced.length - 1 && !voiced[f]) f++; // a word doesn't start in a pause: it starts where the speech resumes
    if (!voiced[f]) f = k;
    f = Math.max(f, prev + 1);
    prev = f;
    return Math.min(end, (f0 + f) * frame);
  });
}

/** Cues with the start of every word (w for the native line, we for English) from the audio's loudness. */
export function withWordTimes(cues: Cue[], level: ArrayLike<number>, frame: number): Cue[] {
  return cues.map((c) => ({
    ...dropAnchor(c),
    w: c.ta ? wordStarts(c.ta, c.start, c.end, level, frame) : undefined,
    we: c.en ? wordStarts(c.en, c.start, c.end, level, frame) : undefined,
  }));
}

/**
 * Re-time the cues cut from one speech-model window (an anchor cue and the back-to-back cues after it): the window's
 * start and end are the model's, the cuts between were shared by text length. Shared over the time with speech in
 * it instead (wordStarts), a cut lands where its first word is said, so later cues no longer drift after pauses.
 */
export function retimeWindows(cues: Cue[], level: ArrayLike<number>, frame: number): Cue[] {
  const out = cues.map((c) => ({ ...c }));
  for (let i = 0; i < out.length; ) {
    let j = i;
    while (j + 1 < out.length && !out[j + 1].anchor && Math.abs(out[j + 1].start - out[j].end) < 0.05) j++;
    if (out[i].anchor && j > i) {
      const lines = out.slice(i, j + 1).map((c) => (c.ta || c.en).split(/\s+/).filter(Boolean));
      const starts = wordStarts(lines.map((l) => l.join(" ")).join(" "), out[i].start, out[j].end, level, frame);
      let w = lines[0].length;
      for (let k = i + 1; k <= j; k++) {
        const t = starts[w];
        // Keep every cue at least 0.3 s long.
        if (t !== undefined && t > out[k - 1].start + 0.3 && t < out[k].end - 0.3) out[k - 1].end = out[k].start = t;
        w += lines[k - i].length;
      }
    }
    i = j + 1;
  }
  return out;
}

/** A cue without the job-time `anchor` flag (it isn't stored). */
export function dropAnchor(c: Cue): Cue {
  const out = { ...c };
  delete out.anchor;
  return out;
}

/**
 * English captions in whole sentences, for English shown on its own. The English line of a Tamil (or other) project is
 * shared across the Tamil captions word by word, so alone it reads in fragments ("I also got acne in the same" /
 * "way,"). Here each stretch of back-to-back captions is read as one translation and cut again at sentence ends, a
 * long sentence also at a comma or a clause word, up to `max` characters (two lines). Each caption starts with its
 * first word (measured word starts when known) and keeps that word's caption look.
 */
export function englishCues(cues: Cue[], max = 84): Cue[] {
  const out: Cue[] = [];
  for (let i = 0; i < cues.length; ) {
    let j = i;
    while (j + 1 < cues.length && cues[j + 1].start - cues[j].end < 0.3) j++;
    const words: { w: string; s: number; c: Cue }[] = [];
    for (let k = i; k <= j; k++) {
      const c = cues[k], ws = c.en.split(/\s+/).filter(Boolean);
      const total = ws.reduce((n, w) => n + w.length + 1, 0) || 1;
      let so = 0;
      const st = c.we && c.we.length === ws.length ? c.we : ws.map((w) => { const t = c.start + ((c.end - c.start) * so) / total; so += w.length + 1; return t; });
      ws.forEach((w, n) => words.push({ w, s: st[n], c }));
    }
    const runEnd = cues[j].end;
    i = j + 1;
    if (!words.length) continue;
    // Cut points: after a sentence end; a long sentence also at its best break before it gets too long.
    const pieces: (typeof words)[] = [];
    let cur: typeof words = [];
    const len = (ws: typeof words) => ws.reduce((n, x) => n + x.w.length + 1, 0) - 1;
    for (const x of words) {
      if (cur.length && len([...cur, x]) > max) {
        let at = cur.length; // break before the last clause word or after the last comma in the second half
        for (let k = cur.length - 1; k >= Math.ceil(cur.length / 2); k--) {
          if (/[,;:]$/.test(cur[k - 1]?.w ?? "")) { at = k; break; }
          if (CLAUSE.test(cur[k].w.replace(/^[("']+/, ""))) { at = k; break; }
        }
        pieces.push(cur.slice(0, at));
        cur = cur.slice(at);
      }
      cur.push(x);
      if (/[.?!]["')]*$/.test(x.w) && !/^(Mr|Mrs|Ms|Dr|St|vs|etc)\.$/i.test(x.w)) { pieces.push(cur); cur = []; }
    }
    if (cur.length) pieces.push(cur);
    pieces.forEach((p, k) => {
      const start = k ? p[0].s : Math.min(p[0].s, words[0].c.start);
      const end = k + 1 < pieces.length ? pieces[k + 1][0].s : runEnd;
      if (end - start < 0.05) return;
      const c: Cue = { start, end, ta: "", en: p.map((x) => x.w).join(" "), we: p.map((x) => Math.max(start, x.s)) };
      if (p[0].c.style) c.style = p[0].c.style;
      out.push(c);
    });
  }
  return out;
}

/**
 * English for each sentence of the native line, from a text translator: captions are grouped into the sentences they
 * cut (a sentence ends at . ? ! । or where a speech-model window ends), each sentence is translated on its own, and
 * its English is shared across that sentence's captions by their length. The English then stays with the sentence it
 * translates; a whole window translated at once drifted a caption or more from the speech (Tamil puts the verb last,
 * so its English can't be cut where the Tamil is). Runs `parallel` translations at a time.
 */
export async function translateBySentence(cues: Cue[], translate: (text: string) => Promise<string>, parallel = 4): Promise<Cue[]> {
  const groups: number[][] = [];
  let cur: number[] = [];
  cues.forEach((c, i) => {
    if (cur.length && c.anchor) { groups.push(cur); cur = []; }
    cur.push(i);
    const len = cur.reduce((n, k) => n + cues[k].ta.length + 1, 0);
    if (/[.?!।]["')\]]*$/.test(c.ta.trim()) || len > 1500) { groups.push(cur); cur = []; }
  });
  if (cur.length) groups.push(cur);
  const english: string[] = new Array(groups.length);
  const queue = groups.map((_, g) => g);
  await Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, async () => {
    for (let g; (g = queue.shift()) !== undefined; ) {
      const text = groups[g].map((k) => cues[k].ta).join(" ").trim();
      english[g] = text ? (await translate(text)).trim() : "";
    }
  }));
  const out = cues.map((c) => ({ ...c }));
  groups.forEach((g, n) => {
    const shares = divide(english[n], g.map((k) => Math.max(1, out[k].ta.length)));
    g.forEach((k, j) => { out[k].en = shares[j] ?? ""; });
  });
  return out;
}

/**
 * Captions too short to read (under `min` seconds; a few words left at the end of a sentence or a window) join the
 * neighbour they run into, the one with less text, so nothing flashes past. Word times are dropped (they're measured
 * again afterwards); a caption with a real gap on both sides is left alone.
 */
export function mergeShort(cues: Cue[], min = 0.7): Cue[] {
  const out = cues.map((c) => ({ ...c }));
  const join = (a: string, b: string) => [a, b].filter((x) => x.trim()).join(" ");
  for (let i = 0; i < out.length; ) {
    const c = out[i];
    if (c.end - c.start >= min || out.length < 2) { i++; continue; }
    const prev = i > 0 && c.start - out[i - 1].end < 0.05 ? out[i - 1] : null;
    const next = i + 1 < out.length && out[i + 1].start - c.end < 0.05 ? out[i + 1] : null;
    if (!prev && !next) { i++; continue; }
    const intoPrev = !!prev && (!next || prev.ta.length + prev.en.length <= next.ta.length + next.en.length);
    if (intoPrev) {
      out[i - 1] = { ...prev!, end: c.end, ta: join(prev!.ta, c.ta), en: join(prev!.en, c.en), w: undefined, we: undefined };
      out.splice(i, 1);
    } else {
      out[i + 1] = { ...next!, start: c.start, ta: join(c.ta, next!.ta), en: join(c.en, next!.en), w: undefined, we: undefined, ...(c.anchor ? { anchor: true } : {}) };
      out.splice(i, 1);
    }
  }
  return out.map((c) => { const o = { ...c }; if (!o.w) delete o.w; if (!o.we) delete o.we; return o; });
}
