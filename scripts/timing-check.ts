/**
 * Timing check: how close the captions Vasanam makes are to an answer key of real word times.
 *
 *   npx tsx scripts/timing-check.ts <clips dir>             score saved results (<name>.out.json)
 *   npx tsx scripts/timing-check.ts <clips dir> --upload    subtitle every clip on the server first
 *     (needs VASANAM_URL and VASANAM_KEY, an API key from Account; it uses that account's minutes)
 *
 * The clips dir holds <name>.mp4 (or any video), <name>.wav (16 kHz mono, for the speech check when the server
 * didn't send one) and the answer key from scripts/timing/keys/<name>.key.json (copied there or found automatically).
 * Make a key for a new clip with scripts/timing/align.py (see scripts/timing/README.md).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Cue } from "@/db";
import { scoreTiming, speechRegions, stats, timingIssues, type KeyWord, type Speech, type TimingScore } from "@/lib/timing";

const dir = process.argv[2];
const upload = process.argv.includes("--upload");
if (!dir) { console.error("usage: timing-check.ts <clips dir> [--upload]"); process.exit(1); }
const KEYS = join(import.meta.dirname, "timing", "keys");
const keyOf = (name: string) => [join(dir, `${name}.key.json`), join(KEYS, `${name}.key.json`)].find(existsSync);
const names = [...new Set(readdirSync(dir).map((f) => f.replace(/\.[^.]+$/, "")).filter((n) => !n.includes(".")))].filter(keyOf).sort();
if (!names.length) { console.error("No clips with an answer key in", dir); process.exit(1); }

/** Loudness in dB per 20 ms from a 16-bit PCM WAV (as lib/media.loudness does from ffmpeg). */
function wavLevel(file: string) {
  const b = readFileSync(file);
  let p = 12, data = 0, len = 0, rate = 16000;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === "fmt ") rate = b.readUInt32LE(p + 12);
    if (id === "data") { data = p + 8; len = Math.min(size, b.length - data); break; }
    p += 8 + size + (size & 1);
  }
  const per = Math.round(rate * 0.02), out: number[] = [];
  for (let i = data; i + per * 2 <= data + len; i += per * 2) {
    let s = 0;
    for (let k = 0; k < per; k++) { const v = b.readInt16LE(i + 2 * k) / 32768; s += v * v; }
    out.push(10 * Math.log10(s / per + 1e-10));
  }
  return out;
}

async function subtitle(name: string): Promise<{ cues: Cue[]; speech?: Speech }> {
  const url = process.env.VASANAM_URL, key = process.env.VASANAM_KEY;
  if (!url || !key) throw new Error("Set VASANAM_URL and VASANAM_KEY to upload.");
  const video = readdirSync(dir).find((f) => f.startsWith(name + ".") && /\.(mp4|mov|m4v|mkv|webm|mp3|m4a|wav)$/i.test(f) && !f.endsWith(".wav"))
    ?? `${name}.wav`;
  const auth = { authorization: `Bearer ${key}` };
  const up = await fetch(`${url}/api/upload?name=timing-${basename(video)}&lang=ta-IN&script=native`, { method: "POST", headers: auth, body: readFileSync(join(dir, video)) }).then((r) => r.json());
  if (!up.id) throw new Error(`${name}: upload failed: ${JSON.stringify(up)}`);
  for (;;) {
    await new Promise((r) => setTimeout(r, 4000));
    const j = await fetch(`${url}/api/jobs/${up.id}`, { headers: auth }).then((r) => r.json());
    if (j.status === "failed") throw new Error(`${name}: ${j.error}`);
    if (j.status === "done") { writeFileSync(join(dir, `${name}.out.json`), JSON.stringify(j)); return j; }
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(4);
const sec = (x: number) => `${x.toFixed(2)}s`;
const rows: string[][] = [["clip", "words", "word start ±0.2s", "median", "caption start ±0.2s", "median", "off captions", "flagged", "flags right", "off found"]];
const all = { ws: [] as number[], cs: [] as number[], off: 0, caps: 0, flagged: 0, right: 0, found: 0 };

async function main() {
  for (const name of names) {
    const key: KeyWord[] = JSON.parse(readFileSync(keyOf(name)!, "utf8"));
    const out = upload ? await subtitle(name) : JSON.parse(readFileSync(join(dir, `${name}.out.json`), "utf8"));
    const cues: Cue[] = out.cues;
    const speech: Speech = out.speech ?? (existsSync(join(dir, `${name}.wav`)) ? speechRegions(wavLevel(join(dir, `${name}.wav`)), 0.02) : []);
    const s: TimingScore = scoreTiming(cues, key);
    // The speech check (what the editor shows) against the key: captions it flags, and how many are really off.
    const flagged = new Set(timingIssues(cues, speech).filter((x) => x.cue >= 0).map((x) => x.cue));
    const off = new Set(s.off), right = [...flagged].filter((i) => off.has(i)).length, found = [...off].filter((i) => flagged.has(i)).length;
    rows.push([name, String(s.words), pct(s.wordStart.within200), sec(s.wordStart.median), pct(s.captionStart.within200), sec(s.captionStart.median),
      `${off.size}/${s.captions}`, String(flagged.size), flagged.size ? `${right}/${flagged.size}` : "-", off.size ? `${found}/${off.size}` : "-"]);
    // Per-caption detail for a closer look.
    writeFileSync(join(dir, `${name}.score.json`), JSON.stringify({ score: s, issues: timingIssues(cues, speech), speech }, null, 1));
    all.ws.push(...s.errors.word); all.cs.push(...s.errors.start);
    all.off += off.size; all.caps += s.captions; all.flagged += flagged.size; all.right += right; all.found += found;
  }
  const W = stats(all.ws), C = stats(all.cs);
  rows.push(["ALL", String(W.n), pct(W.within200), sec(W.median), pct(C.within200), sec(C.median), `${all.off}/${all.caps}`, String(all.flagged),
    all.flagged ? `${all.right}/${all.flagged}` : "-", all.off ? `${all.found}/${all.off}` : "-"]);
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  for (const r of rows) console.log(r.map((c, i) => c.padEnd(widths[i])).join("  "));
}
main().catch((e) => { console.error(e); process.exit(1); });
