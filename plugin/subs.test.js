// node plugin/subs.test.js
const assert = require("node:assert/strict");
const { placeCues, toSrt, partsChunks } = require("./subs.js");

const cues = [
  { start: 1, end: 3, ta: "ஒன்று", en: "one" },
  { start: 9, end: 12, ta: "இரண்டு", en: "two" },
  { start: 20, end: 22, ta: "மூன்று", en: "three" },
];

// Clip uses source 10s–21s and sits at 100s on the timeline (offset = 100 - 10 = 90).
const placed = placeCues(cues, 90, 10, 21);
assert.deepEqual(placed.map((c) => [c.start, c.end]), [[100, 102], [110, 111]]);

assert.equal(toSrt([cues[0]], "both"), "1\n00:00:01,000 --> 00:00:03,000\nஒன்று\none\n");
assert.deepEqual(toSrt([{ start: 0, end: 1, ta: "one two three four", en: "a b" }], "both", 2).split("\n").slice(2, 6), ["one two", "three four", "a", "b"]);
// Three-box templates: up to 3 words a piece, timed by length; with English, 2 native words and the English share below.
const p1 = partsChunks({ start: 0, end: 10, ta: "a bb ccc dddd eeeee", en: "" }, "ta");
assert.deepEqual(p1.map((c) => c.parts), [["a", "bb", "ccc"], ["dddd", "eeeee", ""]]);
assert.equal(p1[0].start, 0); assert.equal(p1[1].end, 10); assert.ok(Math.abs(p1[0].end - 10 * 9 / 20) < 1e-9);
assert.deepEqual(partsChunks({ start: 0, end: 4, ta: "ஒன்று இரண்டு மூன்று", en: "one two three four" }, "both").map((c) => c.parts),
  [["ஒன்று", "இரண்டு", "one two"], ["", "மூன்று", "three four"]]);
assert.deepEqual(partsChunks({ start: 0, end: 1, ta: "x", en: "Hello" }, "en").map((c) => c.parts), [["", "Hello", ""]]);
assert.deepEqual(partsChunks({ start: 0, end: 2, ta: "a bb ccc dddd eeeee", en: "" }, "ta", 1.5).map((c) => c.parts), [["a bb", "ccc", "dddd eeeee"]]);
// Each box starts when its words are said, in reading order: top, big, bottom.
const at = partsChunks({ start: 0, end: 3, ta: "aa bb cc", en: "" }, "ta")[0].at;
assert.deepEqual(at.map((t) => +t.toFixed(2)), [0, 1, 2]);
// Measured word starts (w) time the pieces and boxes; placeCues moves them with the clip.
const timed = { start: 0, end: 6, ta: "a b c d e f", en: "", w: [0, 0.5, 1, 3, 4.5, 5] };
const tp = partsChunks(timed, "ta");
assert.deepEqual(tp.map((p) => [p.start, p.end]), [[0, 3], [3, 6]]);
assert.deepEqual(tp[1].at, [3, 4.5, 5]);
assert.deepEqual(placeCues([timed], 10, 0, 99)[0].w, [10, 10.5, 11, 13, 14.5, 15]);
console.log("plugin subs ok");
