import { test } from "node:test";
import assert from "node:assert/strict";
import { insertAt, mergeCues, setText, setWord, splitCue } from "./cueEdit";

test("splitCue cuts at the first word said after the playhead, word times and colours follow their words", () => {
  const c = { start: 0, end: 4, ta: "a b c d", en: "one two", w: [0, 1, 2, 3], wc: [null, "#ff0000", null, null], style: { size: 1.2 } };
  const [a, b] = splitCue(c, 1.5)!;
  assert.deepEqual([a.ta, a.en, a.start, a.end, a.w, a.wc], ["a b", "one", 0, 2, [0, 1], [null, "#ff0000"]]);
  assert.deepEqual([b.ta, b.en, b.start, b.end, b.w, b.wc], ["c d", "two", 2, 4, [2, 3], [null, null]]);
  assert.deepEqual(b.style, { size: 1.2 });
  assert.equal(splitCue({ start: 0, end: 4, ta: "one", en: "" }, 2), undefined, "one word can't be split");
});

test("mergeCues joins text and word times", () => {
  const m = mergeCues({ start: 0, end: 2, ta: "a b", en: "x", w: [0, 1] }, { start: 2.5, end: 4, ta: "c", en: "y", w: [2.5] });
  assert.deepEqual([m.start, m.end, m.ta, m.en, m.w], [0, 4, "a b c", "x y", [0, 1, 2.5]]);
});

test("insertAt adds an empty caption in the gap at the playhead", () => {
  const cues = [{ start: 0, end: 2, ta: "a", en: "" }, { start: 5, end: 6, ta: "b", en: "" }];
  const r = insertAt(cues, 3, 10);
  assert.equal(r.index, 1);
  assert.deepEqual([r.cues[1].start, r.cues[1].end], [3, 5]);
  const inside = insertAt([{ start: 0, end: 10, ta: "a", en: "" }], 5, 10); // inside a long caption: at its edge, room made from it
  assert.deepEqual(inside.cues.map((c) => [c.start, c.end]), [[0, 8.8], [8.8, 10]]);
  assert.equal(insertAt([{ start: 0, end: 0.5, ta: "a", en: "" }, { start: 0.5, end: 1, ta: "b", en: "" }], 0.4, 1).index, -1, "no room anywhere");
});

test("setText and setWord keep word times with their words", () => {
  const c = { start: 0, end: 4, ta: "a b c d", en: "", w: [0, 1, 2, 3] };
  assert.deepEqual(setText(c, "ta", "a b c d").w, [0, 1, 2, 3]);
  assert.deepEqual(setText(c, "ta", "a b X Y c d").w, [0, 1, 2, 2 + 1 / 3, 2 + 2 / 3, 3], "added words share the next word's time");
  assert.deepEqual(setText(c, "ta", "a b c X d").w, [0, 1, 2, 3, 3.5]);
  const removed = setText(c, "ta", "a c d");
  assert.deepEqual(removed.w, [0, 2, 3]);
  assert.deepEqual(setWord(c, "ta", 2, { start: 2.5 }).w, [0, 1, 2.5, 3]);
  assert.deepEqual(setWord(c, "ta", 2, { start: 9 }).w, [0, 1, 2.95, 3], "kept before the next word");
  assert.deepEqual(setWord(c, "ta", 1, { color: "#00ff00" }).wc, [null, "#00ff00", null, null]);
  assert.equal(setWord(setWord(c, "ta", 1, { color: "#00ff00" }), "ta", 1, { color: null }).wc, undefined);
  assert.equal(setWord(c, "ta", 1, { text: "B" }).ta, "a B c d");
});

test("insertBetween makes room between touching captions, from both sides, keeping their words in step", async () => {
  const { insertBetween } = await import("./cueEdit");
  const cues = [{ start: 0, end: 2, ta: "a b", en: "", w: [0, 1] }, { start: 2, end: 4, ta: "c d", en: "", w: [2, 3] }];
  const r = insertBetween(cues, 0, 10);
  assert.equal(r.index, 1);
  assert.deepEqual(r.cues.map((c) => [c.start, c.end]), [[0, 1.4], [1.4, 2.6], [2.6, 4]], "1.2 s, 0.6 from each");
  assert.deepEqual(r.cues[0].w, [0, 0.7], "words squeezed with their caption");
  assert.deepEqual(r.cues[2].w, [2.6, 3.3]);
  const short = [{ start: 0, end: 0.6, ta: "a", en: "" }, { start: 0.6, end: 3, ta: "b", en: "" }];
  assert.deepEqual(insertBetween(short, 0, 10).cues.map((c) => [c.start, c.end]), [[0, 0.5], [0.5, 1.7], [1.7, 3]], "the longer side gives more");
  assert.equal(insertBetween([{ start: 0, end: 0.5, ta: "a", en: "" }, { start: 0.5, end: 1, ta: "b", en: "" }], 0, 10).index, -1, "no room");
  assert.deepEqual(insertBetween(cues, 1, 10).cues.at(-1), { start: 4, end: 5.2, ta: "", en: "" }, "after the last, into the free time");
});

test("insertAt inside a caption adds one at its nearer edge", () => {
  const cues = [{ start: 0, end: 2, ta: "a", en: "" }, { start: 2, end: 4, ta: "b", en: "" }];
  const r = insertAt(cues, 1.8, 10);
  assert.equal(r.index, 1, "between the two");
  assert.deepEqual(r.cues.map((c) => [c.start, c.end]), [[0, 1.4], [1.4, 2.6], [2.6, 4]]);
});

test("removeCue: a caption between touching ones gives its time back to them; one beside a gap just goes", async () => {
  const { insertBetween, removeCue } = await import("./cueEdit");
  const cues = [{ start: 0, end: 2, ta: "a b", en: "", w: [0, 1] }, { start: 2, end: 4, ta: "c d", en: "", w: [2, 3] }];
  const added = insertBetween(cues, 0, 10);
  assert.deepEqual(removeCue(added.cues, added.index), cues, "adding then deleting puts everything back");
  const gap = [{ start: 0, end: 1, ta: "a", en: "" }, { start: 1, end: 2, ta: "b", en: "" }, { start: 3, end: 4, ta: "c", en: "" }];
  assert.deepEqual(removeCue(gap, 1).map((c) => [c.start, c.end]), [[0, 1], [3, 4]], "a gap beside it: nothing stretched");
  assert.deepEqual(removeCue(gap, 0).map((c) => [c.start, c.end]), [[1, 2], [3, 4]], "the first: nothing stretched");
});
