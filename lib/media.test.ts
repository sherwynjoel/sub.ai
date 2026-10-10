import { test } from "node:test";
import assert from "node:assert/strict";
import { speechLines } from "./media";

test("speechLines merges close phrases, splits at real pauses and caps line length", () => {
  // Silences from a real 8.77 s Tamil clip.
  const s: [number, number][] = [[1.209, 1.665], [2.262, 2.933], [3.365, 3.744], [4.542, 5.059], [7.566, 8.765]];
  assert.deepEqual(speechLines(s, 8.765), [[0, 2.262], [2.933, 4.542], [5.059, 7.566]]);
  assert.deepEqual(speechLines([], 45), [[0, 20], [20, 40], [40, 45]]);
  assert.deepEqual(speechLines([[0, 30]], 30), []);
});
