import { test } from "node:test";
import assert from "node:assert/strict";
import { toSrt, toVtt, mergeChunks } from "./subtitles";
import { secondsLeft, effectivePlan } from "./plans";

const cue = (start: number, end: number, ta = "வணக்கம்", en = "Hello") => ({ start, end, ta, en });

test("srt formatting", () => {
  assert.equal(toSrt([cue(3661.5, 3662.25)], "both"), "1\n01:01:01,500 --> 01:01:02,250\nவணக்கம்\nHello\n");
  assert.equal(toVtt([cue(0, 1)], "en"), "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello\n");
});

test("merge shifts, clamps, drops empties and sorts", () => {
  const out = mergeChunks([
    { offset: 300, duration: 300, cues: [cue(1, 2), cue(299, 400)] },
    { offset: 0, duration: 300, cues: [cue(5, 6), cue(7, 7), cue(8, 9, "", "")] },
  ]);
  assert.deepEqual(out.map((c) => [c.start, c.end]), [[5, 6], [301, 302], [599, 600]]);
});

test("quota falls back to trial after period ends", () => {
  const now = new Date("2026-10-07");
  const paid = { plan: "pro", secondsUsed: 600, periodEnd: new Date("2026-11-01") };
  assert.equal(secondsLeft(paid, now), 1200 * 60 - 600);
  assert.equal(effectivePlan({ ...paid, periodEnd: new Date("2026-10-01") }, now), "free");
  assert.equal(secondsLeft({ plan: "free", secondsUsed: 99999, periodEnd: null }, now), 0);
});
