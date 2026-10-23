import { test } from "node:test";
import assert from "node:assert/strict";
import { matchWords, paceIssues, scoreTiming, speechRegions, stats, timingIssues } from "./timing";

const cue = (start: number, end: number, ta: string, w?: number[]) => ({ start, end, ta, en: "", ...(w ? { w } : {}) });

/** Loudness per 20 ms: -60 dB quiet, -20 dB where the stretches say there's speech. */
const levels = (dur: number, talk: [number, number][]) =>
  Array.from({ length: Math.round(dur / 0.02) }, (_, f) => (talk.some(([s, e]) => f * 0.02 >= s && f * 0.02 < e) ? -20 : -60));

test("speech regions: loud stretches, short gaps bridged, blips dropped", () => {
  const sp = speechRegions(levels(10, [[1, 3], [3.2, 4], [6, 6.06], [7, 9]]), 0.02);
  assert.equal(sp.length, 2, "the 0.2 s gap is bridged and the 60 ms blip dropped");
  assert.ok(Math.abs(sp[0][0] - 1) < 0.1 && Math.abs(sp[0][1] - 4) < 0.1);
  assert.ok(Math.abs(sp[1][0] - 7) < 0.1 && Math.abs(sp[1][1] - 9) < 0.1);
  assert.deepEqual(speechRegions(levels(5, []), 0.02), [], "silence has no speech");
});

test("timing issues: silence, early, late, cut short and missed speech", () => {
  const speech: [number, number][] = [[1, 3], [5, 7], [9, 10], [12, 14.5]];
  const kinds = (cues: ReturnType<typeof cue>[]) => timingIssues(cues, speech).map((x) => `${x.kind}@${x.cue}`);
  assert.deepEqual(kinds([cue(1, 3, "a"), cue(5, 7, "b"), cue(9, 10, "c"), cue(12, 14.5, "d")]), [], "lined up: nothing");
  assert.deepEqual(kinds([cue(1, 3, "a"), cue(3.5, 4.8, "x"), cue(5, 7, "b"), cue(9, 10, "c"), cue(12, 14.5, "d")]), ["silent@1"]);
  assert.deepEqual(kinds([cue(0.2, 3, "a"), cue(5, 7, "b"), cue(9, 10, "c"), cue(12, 14.5, "d")]), ["early@0"]);
  assert.deepEqual(kinds([cue(1, 3, "a"), cue(5.6, 7, "b"), cue(9, 10, "c"), cue(12, 14.5, "d")]), ["late@1"]);
  assert.deepEqual(kinds([cue(1, 2.2, "a"), cue(5, 7, "b"), cue(9, 10, "c"), cue(12, 14.5, "d")]), ["cut@0"]);
  assert.deepEqual(kinds([cue(1, 3, "a"), cue(5, 7, "b"), cue(9, 10, "c")]), ["missed@-1"]);
  assert.deepEqual(kinds([cue(1, 3, "a"), cue(3, 7, "b"), cue(9, 10, "c"), cue(12, 14.5, "d")]), [], "a caption held over a pause is fine");
});

test("pace: a caption far faster or slower than the rest is flagged", () => {
  const line = "ஒன்று இரண்டு மூன்று"; // the same words in every caption
  const cues = [0, 2, 4, 6, 8].map((s) => cue(s, s + 2, line));
  assert.deepEqual(paceIssues(cues), []);
  cues[2] = cue(4, 4.5, line); // squeezed into 0.5 s
  cues[3] = cue(4.5, 12, line); // and its neighbour stretched to 7.5 s
  assert.deepEqual(paceIssues(cues).map((x) => `${x.kind}@${x.cue}`), ["fast@2", "slow@3"]);
  assert.deepEqual(paceIssues(cues.slice(0, 3)), [], "too few captions to judge");
});

test("answer key: words matched in order, starts and ends scored", () => {
  assert.deepEqual(matchWords(["a", "b,", "c", "d"], ["a", "x", "b", "d"]), [[0, 0], [1, 2], [3, 3]]);
  const cues = [cue(0, 1, "நான் வந்தேன்", [0, 0.5]), cue(1, 2.2, "நீ வா", [1.0, 1.3])];
  const key = [
    { text: "நான்", start: 0.05, end: 0.4 }, { text: "வந்தேன்", start: 0.6, end: 0.95 },
    { text: "நீ", start: 1.7, end: 1.9 }, { text: "வா", start: 1.95, end: 2.1, score: 0.9 },
  ];
  const s = scoreTiming(cues, key);
  assert.equal(s.words, 4);
  assert.equal(s.captions, 2);
  assert.deepEqual(s.off, [1], "the second caption starts 0.7 s before its first word");
  assert.equal(s.wordStart.within200, 0.5);
  assert.equal(scoreTiming(cues, key.map((k) => ({ ...k, score: 0.1 }))).words, 0, "unsure key words are left out");
  assert.deepEqual(stats([]), { n: 0, median: 0, p90: 0, within100: 0, within200: 0, within500: 0 });
});
