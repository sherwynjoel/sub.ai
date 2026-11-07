import assert from "node:assert/strict";
import { test } from "node:test";
import { LEVEL_STEP, packLevels, unpackLevels } from "./waveform";

test("levels: a step shows its loudest frame, against the file's peak", () => {
  const db = [-90, -10, -90, -90, -90, -55, -90, -90, -90, -32.5, -90]; // three 0.02 s frames to a step
  const out = unpackLevels(packLevels(db, 0.02));
  assert.deepEqual([...out], [255, 0, 0, 128]);
});

test("levels: the wave is as long as the sound, whatever its length", () => {
  for (const seconds of [6, 60, 3600]) {
    const frames = new Float32Array(seconds / 0.02).fill(-20);
    assert.ok(Math.abs(unpackLevels(packLevels(frames, 0.02)).length * LEVEL_STEP - seconds) < LEVEL_STEP);
  }
});

test("levels: silence and an empty file stay small and safe", () => {
  assert.deepEqual([...unpackLevels(packLevels([], 0.02))], []);
  assert.deepEqual([...unpackLevels(packLevels([-100, -100, -100], 0.02))], [255]);
});
