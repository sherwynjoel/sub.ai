// node plugin/subs.test.js
const assert = require("node:assert/strict");
const { placeCues, toSrt } = require("./subs.js");

const cues = [
  { start: 1, end: 3, ta: "ஒன்று", en: "one" },
  { start: 9, end: 12, ta: "இரண்டு", en: "two" },
  { start: 20, end: 22, ta: "மூன்று", en: "three" },
];

// Clip uses source 10s–21s and sits at 100s on the timeline (offset = 100 - 10 = 90).
const placed = placeCues(cues, 90, 10, 21);
assert.deepEqual(placed.map((c) => [c.start, c.end]), [[100, 102], [110, 111]]);

assert.equal(toSrt([cues[0]], "both"), "1\n00:00:01,000 --> 00:00:03,000\nஒன்று\none\n");
console.log("plugin subs ok");
