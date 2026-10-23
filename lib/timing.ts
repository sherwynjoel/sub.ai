/**
 * Timing checks: where the speech is (from the audio's loudness), which captions don't line up with it, and how far
 * captions are from an answer key of hand-checked or force-aligned word times (scripts/timing-check.ts).
 */
import type { Cue } from "@/db";

/** Stretches of speech, [start, end] in seconds. */
export type Speech = [number, number][];

/**
 * Where someone is speaking: loudness frames (dB per `frame` s, media.loudness) clearly above the file's quiet level,
 * averaged over 100 ms, with gaps under 0.3 s bridged (pauses between words) and blips under 0.15 s dropped.
 */
export function speechRegions(level: ArrayLike<number>, frame: number): Speech {
  const n = level.length;
  if (n < 10) return [];
  const avg: number[] = [];
  for (let f = 0; f < n; f++) {
    let s = 0, k = 0;
    for (let g = f - 2; g <= f + 2; g++) if (g >= 0 && g < n) { s += level[g]; k++; }
    avg.push(s / k);
  }
  const sorted = [...avg].sort((a, b) => a - b), lo = sorted[Math.floor(n * 0.1)], hi = sorted[Math.floor(n * 0.95)];
  if (hi - lo < 6) return []; // flat audio: silence or constant noise
  const cut = lo + 0.3 * (hi - lo);
  const out: Speech = [];
  let from = -1;
  for (let f = 0; f <= n; f++) {
    const on = f < n && avg[f] > cut;
    if (on && from < 0) from = f;
    if (!on && from >= 0) {
      const s = from * frame, e = f * frame, last = out[out.length - 1];
      if (last && s - last[1] < 0.3) last[1] = e;
      else out.push([s, e]);
      from = -1;
    }
  }
  return out.filter(([s, e]) => e - s >= 0.15).map(([s, e]) => [Math.round(s * 100) / 100, Math.round(e * 100) / 100]);
}

export type TimingIssue = {
  kind: "silent" | "early" | "late" | "cut" | "missed" | "fast" | "slow";
  cue: number;     // index of the caption (-1 for speech with no caption)
  at: number;      // where to look, seconds
  by: number;      // how far off, seconds
};
export const ISSUE_TEXT: Record<TimingIssue["kind"], string> = {
  silent: "No speech under this caption",
  early: "Shows before the voice starts",
  late: "The voice starts before this caption",
  cut: "Ends while the voice is still going",
  missed: "Speech with no caption",
  fast: "Too many words for its time: the timing may have slipped",
  slow: "Too few words for its time: the timing may have slipped",
};

/** Seconds of speech inside [a, b]. */
function speechIn(speech: Speech, a: number, b: number) {
  let t = 0;
  for (const [s, e] of speech) if (e > a && s < b) t += Math.min(e, b) - Math.max(s, a);
  return t;
}

/** Letters per second of a caption's line (spaces and punctuation left out). */
const pace = (c: Cue, line: "ta" | "en") => [...c[line].replace(/[\s\p{P}]/gu, "")].length / Math.max(0.1, c.end - c.start);

/**
 * Captions said far faster or slower than the rest of the video: when a cut between captions lands a second or two
 * off, one caption gets too little time for its words and its neighbour too much. Measured against the answer key
 * (scripts/timing-check.ts), most captions flagged this way really were off.
 */
export function paceIssues(cues: Cue[], line: "ta" | "en" = "ta"): TimingIssue[] {
  const idx = cues.map((c, i) => i).filter((i) => [...cues[i][line].replace(/[\s\p{P}]/gu, "")].length >= 8);
  if (idx.length < 5) return [];
  const rates = idx.map((i) => pace(cues[i], line)), med = [...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)];
  const out: TimingIssue[] = [];
  idx.forEach((i, k) => {
    const r = rates[k] / med;
    if (r > 1.8 || r < 0.45) out.push({ kind: r > 1 ? "fast" : "slow", cue: i, at: cues[i].start, by: Math.round(r * 100) / 100 });
  });
  return out;
}

/**
 * Captions that don't line up with the speech: one shown over silence, one that comes up 0.5 s or more before the
 * voice, one the voice starts 0.4 s or more before (with no caption up), one that ends 0.5 s or more before the voice
 * stops (with no caption after it), and 1.5 s or more of speech with no caption at all; plus paceIssues.
 * Music under the voice reads as speech, so on songs the speech checks are weaker.
 */
export function timingIssues(cues: Cue[], speech: Speech, line: "ta" | "en" = "ta"): TimingIssue[] {
  const out: TimingIssue[] = paceIssues(cues, line);
  if (!speech.length) return out.sort((a, b) => a.at - b.at);
  const covered = (t: number) => cues.some((c) => t >= c.start - 0.05 && t <= c.end + 0.05);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  cues.forEach((c, i) => {
    const len = c.end - c.start;
    if (len <= 0) return;
    const voiced = speechIn(speech, c.start, c.end);
    if (len >= 0.6 && voiced < 0.2 * len) { out.push({ kind: "silent", cue: i, at: c.start, by: r2(len) }); return; }
    // Early: nothing said in the caption's first 0.5 s, and no caption before it still talking.
    const first = speech.find(([, e]) => e > c.start);
    if (first && first[0] - c.start >= 0.5 && first[0] < c.end && !(i > 0 && cues[i - 1].end > c.start - 0.05 && speechIn(speech, c.start - 0.3, c.start) > 0))
      out.push({ kind: "early", cue: i, at: c.start, by: r2(first[0] - c.start) });
    // Late: the voice was already going, uncaptioned, before the caption came up.
    const run = speech.find(([s, e]) => s < c.start && e > c.start);
    if (run) {
      let t = c.start;
      while (t - 0.02 > run[0] && !covered(t - 0.06)) t -= 0.02;
      if (c.start - t >= 0.4) out.push({ kind: "late", cue: i, at: t, by: r2(c.start - t) });
    }
    // Cut: the voice goes on, uncaptioned, after the caption ends.
    const on = speech.find(([s, e]) => s < c.end && e > c.end);
    if (on) {
      let t = c.end;
      while (t + 0.02 < on[1] && !covered(t + 0.06)) t += 0.02;
      if (t - c.end >= 0.5) out.push({ kind: "cut", cue: i, at: c.end, by: r2(t - c.end) });
    }
  });
  // Speech nowhere near a caption.
  for (const [s, e] of speech) {
    if (e - s < 1.5 || cues.some((c) => c.end > s - 0.3 && c.start < e + 0.3)) continue;
    out.push({ kind: "missed", cue: -1, at: s, by: r2(e - s) });
  }
  return out.sort((a, b) => a.at - b.at);
}

/* ---------- Scoring against an answer key ---------- */

/** One word of the answer key: when it is really said. */
export type KeyWord = { text: string; start: number; end: number; score?: number };

/** Words of the captions in order, with the caption they're in and their start (measured when known). */
export function captionWords(cues: Cue[], line: "ta" | "en" = "ta") {
  const out: { text: string; cue: number; first: boolean; last: boolean; start?: number }[] = [];
  cues.forEach((c, i) => {
    const words = c[line].split(/\s+/).filter(Boolean), starts = line === "en" ? c.we : c.w;
    words.forEach((w, j) => out.push({ text: w, cue: i, first: j === 0, last: j === words.length - 1, start: starts?.length === words.length ? starts[j] : undefined }));
  });
  return out;
}

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");

/** Pairs [caption word index, key word index] of the same words in the same order (longest common subsequence). */
export function matchWords(a: string[], b: string[]): [number, number][] {
  const A = a.map(norm), B = b.map(norm), n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] && A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (A[i] && A[i] === B[j]) { out.push([i, j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return out;
}

export type TimingScore = {
  words: number;            // key words matched to a caption word
  wordStart: Stats;         // |caption word start − real start|
  captionStart: Stats;      // |caption start − its first word's real start|
  captionEnd: Stats;        // how much of the last word the caption cuts off (0 when it stays up to the word's end or longer)
  captions: number;         // captions with a confident first word
  off: number[];            // captions that start 0.5 s or more off, or end 0.3 s or more before their last word does
  errors: { word: number[]; start: number[] }; // the raw word-start and caption-start errors, for totals over clips
};
export type Stats = { n: number; median: number; p90: number; within100: number; within200: number; within500: number };

export function stats(errs: number[]): Stats {
  const e = [...errs].sort((a, b) => a - b), n = e.length;
  const pct = (p: number) => (n ? e[Math.min(n - 1, Math.floor(p * n))] : 0);
  const share = (t: number) => (n ? e.filter((x) => x <= t).length / n : 0);
  return { n, median: pct(0.5), p90: pct(0.9), within100: share(0.1), within200: share(0.2), within500: share(0.5) };
}

/** How far the captions are from the answer key. Key words with a low aligner score (under `minScore`) are left out. */
export function scoreTiming(cues: Cue[], key: KeyWord[], line: "ta" | "en" = "ta", minScore = 0.3): TimingScore {
  const words = captionWords(cues, line);
  const pairs = matchWords(words.map((w) => w.text), key.map((k) => k.text)).filter(([, j]) => (key[j].score ?? 1) >= minScore);
  const ws: number[] = [], cs: number[] = [], ce: number[] = [];
  const offs = new Set<number>();
  for (const [i, j] of pairs) {
    const w = words[i], k = key[j], c = cues[w.cue];
    if (w.start !== undefined) ws.push(Math.abs(w.start - k.start));
    if (w.first) { const d = Math.abs(c.start - k.start); cs.push(d); if (d >= 0.5) offs.add(w.cue); }
    // A caption may stay up after its last word (time to read); ending before it is said is the fault.
    if (w.last) { const d = Math.max(0, k.end - c.end); ce.push(d); if (d >= 0.3) offs.add(w.cue); }
  }
  return { words: pairs.length, wordStart: stats(ws), captionStart: stats(cs), captionEnd: stats(ce), captions: cs.length, off: [...offs].sort((a, b) => a - b), errors: { word: ws, start: cs } };
}
