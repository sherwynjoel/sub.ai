import { test } from "node:test";
import assert from "node:assert/strict";
import { ENGLISH, MODELS, fillGaps, forcedAlign, placeCues, toIndicLetters, toTamilLetters, wordTokens } from "./align";
import english from "./ctc-vocab/english.json";

test("Latin words are written in Tamil letters by sound", () => {
  assert.equal(toTamilLetters("vanakkam"), "வனக்கம்");
  assert.equal(toTamilLetters("website"), "வெப்ஸிடெ");
  assert.equal(toTamilLetters("Sir,"), "ஸிர்");
  assert.deepEqual(wordTokens("70%"), [], "nothing to align in a number");
  assert.ok(wordTokens("படம்").length === 4 && wordTokens("padam").length > 0);
});

test("forced alignment: each token gets the frames where it is most likely, in order", () => {
  // 3 tokens (5, 6, 5) over 10 frames, vocab of 8; frames 1-2 say 5, 4-5 say 6, 7-8 say 5, the rest blank (1).
  const V = 8, say = [1, 5, 5, 1, 6, 6, 1, 5, 5, 1];
  const lp = new Float32Array(10 * V).fill(-10);
  say.forEach((t, f) => { lp[f * V + t] = -0.1; });
  const spans = forcedAlign(lp, 10, V, [5, 6, 5])!;
  assert.deepEqual(spans.map((s) => [s.first, s.last]), [[1, 2], [4, 5], [7, 8]]);
  assert.equal(forcedAlign(lp, 2, V, [5, 6, 5]), null, "too few frames for the letters");
});

test("words that couldn't be placed share the time between their neighbours", () => {
  assert.deepEqual(fillGaps([{ start: 0, end: 1, prob: 1 }, null, null, { start: 3, end: 4, prob: 1 }], 0, 5),
    [{ start: 0, end: 1 }, { start: 1, end: 2 }, { start: 2, end: 3 }, { start: 3, end: 4 }]);
  assert.deepEqual(fillGaps([null], 2, 4), [{ start: 2, end: 4 }]);
});

test("captions come up with their first word and stay until the next, or briefly after a long pause", () => {
  const cues = [{ start: 0, end: 3, ta: "a b", en: "" }, { start: 3, end: 6, ta: "c", en: "" }, { start: 6, end: 9, ta: "d", en: "" }];
  const t = [{ start: 0.5, end: 0.9 }, { start: 1, end: 1.6 }, { start: 2.2, end: 2.8 }, { start: 5, end: 5.5 }];
  const out = placeCues(cues, t, 7);
  assert.deepEqual(out.map((c) => [c.start, c.end]), [[0.45, 2.15], [2.15, 3.2], [4.95, 5.9]]);
  assert.deepEqual(out[0].w, [0.5, 1]);
  assert.ok(out.every((c) => c.aligned));
  assert.equal(placeCues([{ start: 0, end: 1, ta: "a", en: "" }], [{ start: 0.2, end: 0.6 }], 0.8)[0].end, 0.8, "not past the next window");
});

test("every language's letters become its model's tokens (Tamil exactly as before)", () => {
  // the old built-in Tamil table: letter i at token i + 5
  const OLD = "ஃஅஆஇஈஉஊஎஏஐஒஓஔகஙசஜஞடணதநனபமயரறலளழவஶஷஸஹாிீுூெேைொோௌ்";
  for (const w of ["வணக்கம்", "கொண்டு", "website", "Indha"]) {
    const letters = /[஀-௿]/.test(w) ? w : toTamilLetters(w);
    assert.deepEqual(wordTokens(w, MODELS["ta-IN"]), [...letters].map((c) => OLD.indexOf(c) + 5).filter((t) => t >= 5));
  }
  assert.ok(wordTokens("नमस्ते", MODELS["hi-IN"]).length === 6, "Hindi letters");
  assert.ok(wordTokens("క్షమించండి", MODELS["te-IN"]).length > 5, "Telugu letters");
  assert.deepEqual(wordTokens("क़", MODELS["hi-IN"]).length, 2, "a letter the model writes in parts (क + ़)");
});

test("Latin words: written as they sound in the model's script, as they are for English", () => {
  assert.equal(toIndicLetters("website", 0x0900), "वेब्सिटे");
  assert.equal(toIndicLetters("namaste", 0x0c00), "నమస్టే"); // Telugu, by the parallel block
  assert.ok(wordTokens("website", MODELS["hi-IN"]).length >= 6);
  assert.ok(wordTokens("website", MODELS["kn-IN"]).length >= 6, "Kannada too");
  assert.deepEqual(wordTokens("Hello", ENGLISH), [..."hello"].map((c) => (english as Record<string, number>)[c]));
  assert.deepEqual(wordTokens("vanakkam", MODELS["ur-IN"]), [], "Urdu has no Latin mapping: left to the neighbours");
});
