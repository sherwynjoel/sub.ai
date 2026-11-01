import { test } from "node:test";
import assert from "node:assert/strict";
import { spanPieces } from "./ai/sarvam";
import { layoutCue, mergeChunks, pairChunks } from "./subtitles";

test("Sarvam phrases stamped with no length (0.32–0.32 for a whole clip) still make subtitles", () => {
  const text = "Oru time-la romba loss-la poyittu iruntha Starbucks company avanga initiate panna oru software-naala CSK maathiri mass comeback koduthanga.";
  const fixed = spanPieces([{ start: 0.32, end: 0.32, text }], 52.6);
  assert.deepEqual(fixed, [{ start: 0.32, end: 52.6, text }]);
  const cues = mergeChunks([{ offset: 0, duration: 52.6, cues: pairChunks(fixed, []).flatMap((c) => layoutCue(c)) }]);
  assert.ok(cues.length >= 3 && cues.every((c) => c.end > c.start), `${cues.length} cues`);
  // a zero-length phrase between two good ones runs to the next one's start; good ones stay as they were
  assert.deepEqual(spanPieces([{ start: 0, end: 4, text: "a" }, { start: 4, end: 4, text: "b" }, { start: 9, end: 12, text: "c" }], 20),
    [{ start: 0, end: 4, text: "a" }, { start: 4, end: 9, text: "b" }, { start: 9, end: 12, text: "c" }]);
});
