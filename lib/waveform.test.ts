import assert from "node:assert/strict";
import { test } from "node:test";
import { LEVEL_STEP, packLevels, unpackLevels } from "./waveform";

test("levels: a step shows its loudest frame, against the file's peak", () => {
  const db = [-90, -10, -90, -90, -90, -55, -90, -90, -90, -32.5, -90]; // three 0.02 s frames to a step
  const out = unpackLevels(packLevels(db, 0.02));
  assert.equal(Math.round(LEVEL_STEP / 0.02), 3);
  assert.deepEqual([...out], [255, 0, 0, 128]);
});

test("levels: silence and an empty file stay small and safe", () => {
  assert.deepEqual([...unpackLevels(packLevels([], 0.02))], []);
  assert.deepEqual([...unpackLevels(packLevels([-100, -100, -100], 0.02))], [255]);
});
