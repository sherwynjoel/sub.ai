import { test } from "node:test";
import assert from "node:assert/strict";
import { toSrt, toVtt, mergeChunks, splitLine, divide } from "./subtitles";
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

test("splitLine breaks long lines at sentences then words and shares the time by length", () => {
  const parts = splitLine("Starting from 499. So comment Stree, or check the link in the bio for every material.", 30, 37);
  assert.ok(parts.every((p) => p.text.length <= 42), JSON.stringify(parts));
  assert.equal(parts[0].text, "Starting from 499.");
  assert.equal(parts[0].start, 30);
  assert.ok(Math.abs(parts.at(-1)!.end - 37) < 1e-9);
  assert.deepEqual(splitLine("Short line.", 1, 2), [{ start: 1, end: 2, text: "Short line." }]);
});

test("divide shares a translation across pieces by weight, never leaving a piece empty", () => {
  assert.deepEqual(divide("one two three four", [1, 1]), ["one two", "three four"]);
  assert.deepEqual(divide("one two three four", [3, 1]), ["one two three", "four"]);
  assert.deepEqual(divide("hello", [1]), ["hello"]);
  assert.ok(divide("a b c", [1, 1, 1]).every((p) => p.length > 0));
});
