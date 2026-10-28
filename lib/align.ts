/**
 * Word timing: places every word of a caption in the audio (CTC forced alignment), so captions and the highlighted
 * word start when the word is said. The speech services only time whole phrases of 10–30 s; inside one, cuts were
 * estimated from loudness and drifted up to 2 s (scripts/timing-check.ts measured it).
 *
 * The acoustic models are Vakyansh's wav2vec2 CTC models, one per language (Harveenchadha/vakyansh-wav2vec2-*,
 * MIT; the Tamil one is tamil-tam-250), plus their Indian-English one for stretches spoken in English. Each is
 * exported to int8 ONNX by scripts/timing/export_onnx.py (~95 MB) and kept on the server as
 * models/<id>-ctc.onnx; their alphabets are in lib/ctc-vocab/<id>.json. A language without its model keeps the
 * loudness estimates.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Cue } from "@/db";
import { bin } from "@/lib/media";
import tamil from "./ctc-vocab/tamil.json";
import english from "./ctc-vocab/english.json";
import hindi from "./ctc-vocab/hindi.json";
import telugu from "./ctc-vocab/telugu.json";
import malayalam from "./ctc-vocab/malayalam.json";
import kannada from "./ctc-vocab/kannada.json";
import bengali from "./ctc-vocab/bengali.json";
import marathi from "./ctc-vocab/marathi.json";
import gujarati from "./ctc-vocab/gujarati.json";
import punjabi from "./ctc-vocab/punjabi.json";
import odia from "./ctc-vocab/odia.json";
import urdu from "./ctc-vocab/urdu.json";
import assamese from "./ctc-vocab/assamese.json";
import nepali from "./ctc-vocab/nepali.json";
import maithili from "./ctc-vocab/maithili.json";
import sanskrit from "./ctc-vocab/sanskrit.json";
import dogri from "./ctc-vocab/dogri.json";

/** Every model: "<pad>" is the CTC blank (1) and "|" the gap between words (4), the rest single letters. */
const BLANK = 1, SEP = 4, RATE = 16000;
type Model = { id: string; vocab: Record<string, number>; base: number | null }; // base: the script's Unicode block (Latin words are written in it), null = none
const M = (id: string, vocab: Record<string, number>, base: number | null): Model => ({ id, vocab, base });
const DEVA = 0x0900, BENG = 0x0980;
export const MODELS: Record<string, Model> = {
  "ta-IN": M("tamil", tamil, 0x0b80), "hi-IN": M("hindi", hindi, DEVA), "te-IN": M("telugu", telugu, 0x0c00),
  "ml-IN": M("malayalam", malayalam, 0x0d00), "kn-IN": M("kannada", kannada, 0x0c80), "bn-IN": M("bengali", bengali, BENG),
  "mr-IN": M("marathi", marathi, DEVA), "gu-IN": M("gujarati", gujarati, 0x0a80), "pa-IN": M("punjabi", punjabi, 0x0a00),
  "od-IN": M("odia", odia, 0x0b00), "ur-IN": M("urdu", urdu, null), "as-IN": M("assamese", assamese, BENG),
  "ne-IN": M("nepali", nepali, DEVA), "mai-IN": M("maithili", maithili, DEVA), "sa-IN": M("sanskrit", sanskrit, DEVA),
  "doi-IN": M("dogri", dogri, DEVA), "kok-IN": M("marathi", marathi, DEVA), // Konkani: Devanagari, close to Marathi
};
export const ENGLISH = M("english", english, null);
const modelDir = () => dirname(resolve(process.env.ALIGN_MODEL || "models/tamil-ctc.onnx"));
const installed = (m: Model) => existsSync(join(modelDir(), `${m.id}-ctc.onnx`));

/* ---------- letters ---------- */

const VOWEL: [string, string, string][] = [ // Latin, Tamil vowel letter, Tamil vowel sign
  ["aa", "ஆ", "ா"], ["ai", "ஐ", "ை"], ["au", "ஔ", "ௌ"], ["ee", "ஈ", "ீ"], ["ii", "ஈ", "ீ"], ["oo", "ஊ", "ூ"], ["uu", "ஊ", "ூ"],
  ["ou", "ஔ", "ௌ"], ["ow", "ஔ", "ௌ"], ["a", "அ", ""], ["e", "எ", "ெ"], ["i", "இ", "ி"], ["o", "ஒ", "ொ"], ["u", "உ", "ு"], ["y", "இ", "ி"],
];
const CONS: [string, string][] = [
  ["ksh", "க்ஷ"], ["zh", "ழ"], ["sh", "ஷ"], ["ch", "ச"], ["th", "த"], ["dh", "த"], ["ph", "ஃப"], ["kh", "க"], ["gh", "க"], ["bh", "ப"], ["ng", "ங்க"], ["nj", "ஞ"],
  ["k", "க"], ["g", "க"], ["c", "க"], ["q", "க"], ["j", "ஜ"], ["t", "ட"], ["d", "ட"], ["n", "ன"], ["p", "ப"], ["b", "ப"], ["f", "ஃப"], ["m", "ம"],
  ["y", "ய"], ["r", "ர"], ["l", "ல"], ["v", "வ"], ["w", "வ"], ["s", "ஸ"], ["z", "ஸ"], ["h", "ஹ"], ["x", "க்ஸ"],
];

/**
 * A word in Latin letters (Tanglish or English) written in Tamil letters as it sounds, roughly: the model only knows
 * Tamil letters, and the alignment needs the sounds in order, not the spelling right ("website" → வெப்ஸிடெ).
 */
export function toTamilLetters(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  let out = "", i = 0;
  const vowelAt = (j: number) => VOWEL.find(([l]) => w.startsWith(l, j) && !(l === "y" && j === 0));
  while (i < w.length) {
    const v = vowelAt(i);
    if (v && v[0] !== "y") { out += v[1]; i += v[0].length; continue; }
    const c = CONS.find(([l]) => w.startsWith(l, i));
    if (!c) { i++; continue; }
    i += c[0].length;
    const after = vowelAt(i);
    if (after) { out += c[1] + after[2]; i += after[0].length; }
    else out += c[1] + "்";
  }
  return out;
}

/* Latin letters as they sound in Devanagari (moved to the other Indic scripts by their parallel Unicode blocks). */
const DV_VOWEL: [string, string, string][] = [ // Latin, vowel letter, vowel sign
  ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ee", "ई", "ी"], ["ii", "ई", "ी"], ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
  ["ou", "औ", "ौ"], ["ow", "औ", "ौ"], ["a", "अ", ""], ["e", "ए", "े"], ["i", "इ", "ि"], ["o", "ओ", "ो"], ["u", "उ", "ु"], ["y", "इ", "ि"],
];
const DV_CONS: [string, string][] = [
  ["ksh", "क्ष"], ["chh", "छ"], ["sh", "श"], ["ch", "च"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["kh", "ख"], ["gh", "घ"], ["bh", "भ"], ["jh", "झ"],
  ["ng", "ङ्ग"], ["k", "क"], ["g", "ग"], ["c", "क"], ["q", "क"], ["j", "ज"], ["t", "ट"], ["d", "ड"], ["n", "न"], ["p", "प"], ["b", "ब"],
  ["f", "फ"], ["m", "म"], ["y", "य"], ["r", "र"], ["l", "ल"], ["v", "व"], ["w", "व"], ["s", "स"], ["z", "ज"], ["h", "ह"], ["x", "क्स"],
];
/** A Latin word written as it sounds in an Indic script (block `base`), roughly: "website" → वेबसिटे. */
export function toIndicLetters(word: string, base: number) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  let out = "", i = 0;
  const vowelAt = (j: number) => DV_VOWEL.find(([l]) => w.startsWith(l, j) && !(l === "y" && j === 0));
  while (i < w.length) {
    const v = vowelAt(i);
    if (v && v[0] !== "y") { out += v[1]; i += v[0].length; continue; }
    const c = DV_CONS.find(([l]) => w.startsWith(l, i));
    if (!c) { i++; continue; }
    i += c[0].length;
    const after = vowelAt(i);
    if (after) { out += c[1] + after[2]; i += after[0].length; }
    else out += c[1] + "्";
  }
  return base === DEVA ? out : [...out].map((ch) => String.fromCodePoint(ch.codePointAt(0)! - DEVA + base)).join("");
}

const LATIN = /[A-Za-z]/;
/**
 * A word as the model's tokens: its own letters (a letter the model writes in parts is split, e.g. क़ → क + ़),
 * or, for a word in Latin letters, the letters it sounds like in the model's script (English: the letters as they are).
 */
export function wordTokens(word: string, m: Model = MODELS["ta-IN"]): number[] {
  let text = word.normalize("NFC");
  if (m.id === "english") text = text.toLowerCase();
  else if (LATIN.test(text) && !/[\u0900-\u0DFF]/.test(text)) text = m.base === null ? "" : m.id === "tamil" ? toTamilLetters(text) : toIndicLetters(text, m.base);
  const out: number[] = [];
  for (const ch of text) {
    const t = m.vocab[ch];
    if (t !== undefined && t > SEP) { out.push(t); continue; }
    for (const part of ch.normalize("NFD")) { const p = m.vocab[part]; if (p !== undefined && p > SEP && part !== ch) out.push(p); }
  }
  return out;
}

/* ---------- alignment ---------- */

/**
 * Best path of the tokens through the frames' log-probabilities (CTC forced alignment, Viterbi): for each token,
 * the frames it covers. null when the audio is too short for the letters.
 */
export function forcedAlign(logp: Float32Array, frames: number, vocab: number, tokens: number[]) {
  const L = tokens.length, S = 2 * L + 1;
  if (!L || frames < L) return null;
  const NEG = -1e30;
  let prev = new Float64Array(S).fill(NEG), cur = new Float64Array(S);
  const back = new Uint8Array(frames * S);
  const tok = (s: number) => (s % 2 ? tokens[(s - 1) >> 1] : BLANK);
  prev[0] = logp[BLANK];
  prev[1] = logp[tokens[0]];
  for (let t = 1; t < frames; t++) {
    const row = t * vocab;
    // A state can only be reached if enough frames remain for the tokens after it.
    const lo = Math.max(0, S - 2 * (frames - t) - 1), hi = Math.min(S - 1, 2 * t + 1);
    cur.fill(NEG);
    for (let s = lo; s <= hi; s++) {
      let best = prev[s], from = 0;
      if (s > 0 && prev[s - 1] > best) { best = prev[s - 1]; from = 1; }
      if (s > 1 && s % 2 && tokens[(s - 1) >> 1] !== tokens[(s - 3) >> 1] && prev[s - 2] > best) { best = prev[s - 2]; from = 2; }
      if (best <= NEG) continue;
      cur[s] = best + logp[row + tok(s)];
      back[t * S + s] = from;
    }
    [prev, cur] = [cur, prev];
  }
  let s = prev[S - 1] >= prev[S - 2] ? S - 1 : S - 2;
  if (prev[s] <= NEG) return null;
  // prob: how sure the model was of the token at its most likely frame.
  const spans: { first: number; last: number; prob: number }[] = tokens.map(() => ({ first: -1, last: -1, prob: 0 }));
  for (let t = frames - 1; t >= 0; t--) {
    if (s % 2) {
      const k = (s - 1) >> 1, sp = spans[k];
      sp.first = t;
      if (sp.last < 0) sp.last = t;
      sp.prob = Math.max(sp.prob, Math.exp(logp[t * vocab + tokens[k]]));
    }
    s -= back[t * S + s];
  }
  return spans;
}

type Session = import("onnxruntime-node").InferenceSession;
const sessions = new Map<string, Promise<Session | null>>();
/** A model, loaded once; null when it isn't installed. Two at most stay loaded (~200 MB each in memory). */
export function aligner(m: Model = MODELS["ta-IN"]) {
  let s = sessions.get(m.id);
  if (!s) {
    for (const [id, old] of sessions) if (sessions.size >= 2) { sessions.delete(id); old.then((x) => x?.release()).catch(() => {}); }
    s = (async () => {
      const path = join(modelDir(), `${m.id}-ctc.onnx`);
      if (!existsSync(path)) return null;
      const ort = await import("onnxruntime-node");
      return ort.InferenceSession.create(path, { intraOpNumThreads: 2, graphOptimizationLevel: "all" });
    })().catch((e) => { console.error(`aligner ${m.id} unavailable:`, e); return null; });
    sessions.set(m.id, s);
  }
  return s;
}

/**
 * Log-probabilities per 20 ms frame for 16 kHz mono samples. The model was trained on short utterances: run on half
 * a minute at once it grows unsure and slow (attention grows with the square of the length), so it hears 10 s pieces,
 * each with 1 s of context either side, normalised on their own as in training.
 */
async function logProbs(samples: Float32Array, m: Model) {
  const s = await aligner(m);
  if (!s) return null;
  const ort = await import("onnxruntime-node");
  const PIECE = 10 * RATE, PAD = RATE, FRAME = 320; // the model's stride: 20 ms
  const frames = Math.floor(samples.length / FRAME);
  let data: Float32Array | null = null, vocab = 0;
  for (let at = 0; at < samples.length; at += PIECE) {
    const from = Math.max(0, at - PAD), to = Math.min(samples.length, at + PIECE + PAD);
    const seg = samples.subarray(from, to);
    let mean = 0, sq = 0;
    for (const x of seg) mean += x;
    mean /= seg.length;
    for (const x of seg) sq += (x - mean) ** 2;
    const sd = Math.sqrt(sq / seg.length) + 1e-7;
    const out = (await s.run({ audio: new ort.Tensor("float32", Float32Array.from(seg, (x) => (x - mean) / sd), [1, seg.length]) })).logp;
    const lp = out.data as Float32Array, n = out.dims[1];
    vocab = out.dims[2];
    data ??= new Float32Array(frames * vocab);
    // Keep this piece's own frames (not its context).
    const f0 = Math.floor(at / FRAME), f1 = Math.min(frames, Math.floor(Math.min(samples.length, at + PIECE) / FRAME)), skip = Math.floor((at - from) / FRAME);
    for (let f = f0; f < f1; f++) {
      const g = Math.min(n - 1, f - f0 + skip);
      data.set(lp.subarray(g * vocab, (g + 1) * vocab), f * vocab);
    }
  }
  return data && { data, frames, vocab };
}

/** 16 kHz mono samples of [start, start + dur) of a file. */
export async function readAudio(file: string, start: number, dur: number): Promise<Float32Array | null> {
  const { spawn } = await import("node:child_process");
  return new Promise((done) => {
    const p = spawn(bin("ffmpeg"), ["-v", "error", "-ss", String(Math.max(0, start)), "-t", String(dur), "-i", file, "-vn", "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"]);
    const parts: Buffer[] = [];
    p.stdout.on("data", (b: Buffer) => parts.push(b));
    p.on("error", () => done(null));
    p.on("close", (code) => {
      const b = Buffer.concat(parts);
      done(code === 0 && b.length >= 4 ? new Float32Array(b.buffer, b.byteOffset, b.length >> 2).slice() : null);
    });
  });
}

export type TimedWord = { start: number; end: number; prob: number } | null;

/**
 * When each word is said in `samples` (seconds from the samples' start): null for a word with nothing to align
 * (a number, a symbol), or all null when the alignment fails.
 */
export async function alignWords(samples: Float32Array, words: string[], m: Model = MODELS["ta-IN"]): Promise<TimedWord[] | null> {
  const toks = words.map((w) => wordTokens(w, m));
  const seq: number[] = [], owner: number[] = [];
  toks.forEach((t, i) => {
    if (!t.length) return;
    if (seq.length) { seq.push(SEP); owner.push(-1); }
    seq.push(...t); owner.push(...t.map(() => i));
  });
  if (!seq.length) return null;
  const lp = await logProbs(samples, m);
  if (!lp || lp.frames * seq.length * 2 > 60e6) return null; // too long to align in one go: keep the estimates
  const spans = forcedAlign(lp.data, lp.frames, lp.vocab, seq);
  if (!spans) return null;
  const sec = 320 / RATE; // one frame: 20 ms
  const out: TimedWord[] = words.map(() => null);
  const acc = new Map<number, { first: number; last: number; prob: number; n: number }>();
  spans.forEach((sp, k) => {
    const i = owner[k];
    if (i < 0) return;
    const a = acc.get(i);
    if (!a) acc.set(i, { ...sp, n: 1 });
    else { a.last = sp.last; a.prob += sp.prob; a.n++; }
  });
  for (const [i, a] of acc) out[i] = { start: a.first * sec, end: (a.last + 1) * sec, prob: a.prob / a.n }; // mean of its letters
  return out;
}

/* ---------- captions ---------- */

/** Word times filled in for words that couldn't be aligned, shared between their aligned neighbours. */
export function fillGaps(times: TimedWord[], start: number, end: number): { start: number; end: number }[] {
  const out = times.map((t) => (t ? { start: t.start, end: t.end } : null));
  for (let i = 0; i < out.length; ) {
    if (out[i]) { i++; continue; }
    let j = i;
    while (j < out.length && !out[j]) j++;
    const from = i > 0 ? out[i - 1]!.end : start, to = j < out.length ? out[j]!.start : end, n = j - i;
    for (let k = 0; k < n; k++) out[i + k] = { start: from + ((to - from) * k) / n, end: from + ((to - from) * (k + 1)) / n };
    i = j;
  }
  return out as { start: number; end: number }[];
}

/**
 * Re-time the captions of one speech-model window from its words' times: each caption comes up just before its
 * first word (back-to-back with the one before, unless there's a pause of a second or more) and stays until the
 * next one, or 0.4 s after its last word. Every word gets its start (w). `limit` is where the next window begins.
 */
export function placeCues(cues: Cue[], times: { start: number; end: number }[], limit: number, line: "ta" | "en" = "ta"): Cue[] {
  const LEAD = 0.05, HOLD = 0.4;
  const out: Cue[] = [];
  let k = 0;
  const said = (c: Cue) => (line === "en" ? c.en : c.ta || c.en);
  cues.forEach((c, i) => {
    const n = said(c).split(/\s+/).filter(Boolean).length;
    const ws = times.slice(k, k + n);
    k += n;
    if (!ws.length) { out.push({ ...c }); return; }
    const start = Math.max(0, ws[0].start - LEAD);
    const w = ws.map((x) => Math.round(Math.max(start, x.start) * 100) / 100);
    out.push({ ...c, start, end: ws[ws.length - 1].end, ...(line === "ta" && c.ta ? { w } : { we: w }), aligned: true });
    if (i > 0) {
      const prev = out[i - 1];
      if (start - prev.end < 1) prev.end = start; // back to back
      else prev.end = prev.end + HOLD;
    }
  });
  const last = out[out.length - 1];
  if (last) last.end = Math.min(limit, last.end + HOLD);
  for (const c of out) { c.start = Math.round(c.start * 100) / 100; c.end = Math.round(Math.max(c.end, c.start + 0.3) * 100) / 100; }
  return out;
}

/**
 * Time the words of every speech-model window (an anchor cue and the back-to-back cues after it) from the audio.
 * `line` is what was said: the main line, or for "Translate to …" (English speech) the English one. A window
 * mostly in Latin letters is heard by the English model, the rest by the language's own. Windows that can't be
 * aligned (no model, no letters, the model unsure, too long) keep their estimated times.
 */
export async function alignCues(file: string, cues: Cue[], lang = "ta-IN", line: "ta" | "en" = "ta"): Promise<Cue[]> {
  const own = MODELS[lang], en = installed(ENGLISH) ? ENGLISH : null, mine = own && installed(own) ? own : null;
  if (!en && !mine) return cues;
  const said = (c: Cue) => (line === "en" ? c.en : c.ta || c.en);
  const out: Cue[] = [];
  for (let i = 0; i < cues.length; ) {
    let j = i;
    while (j + 1 < cues.length && !cues[j + 1].anchor && Math.abs(cues[j + 1].start - cues[j].end) < 0.05) j++;
    const group = cues.slice(i, j + 1);
    const from = Math.max(0, group[0].start - 0.4, out.length ? out[out.length - 1].end : 0);
    const to = Math.min(group[group.length - 1].end + 0.4, j + 1 < cues.length ? cues[j + 1].start : Infinity);
    const words = group.flatMap((c) => said(c).split(/\s+/).filter(Boolean));
    const latin = words.filter((w) => LATIN.test(w) && !/[\u0900-\u0DFF]/.test(w)).length;
    // English speech (a translation's source) only by the English model; a mostly-English window by it when it's installed.
    const model = line === "en" ? en : latin >= words.length * 0.6 ? en ?? mine : mine ?? (latin ? en : null);
    const audio = words.length && model ? await readAudio(file, from, to - from) : null;
    const times = audio && model && (await alignWords(audio, words, model).catch((e) => { console.error("align failed:", e); return null; }));
    const known = times?.filter(Boolean) as { prob: number }[] | undefined;
    // Trust it when most words were placed and the model was sure enough: on the test clips Tamil speech scored
    // 0.25–0.87, English speech 0.19–0.5 and a song (music under the voice) 0.08–0.22, where the estimates are safer.
    if (times && known && known.length >= words.length * 0.6 && known.reduce((n, t) => n + t.prob, 0) / known.length >= 0.25) {
      const abs = times.map((t) => (t ? { ...t, start: from + t.start, end: from + t.end } : null));
      out.push(...placeCues(group, fillGaps(abs, from, to), to, line));
    } else out.push(...group);
    i = j + 1;
  }
  return out;
}
