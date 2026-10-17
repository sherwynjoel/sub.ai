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
  assert.equal(insertAt([{ start: 0, end: 10, ta: "a", en: "" }], 5, 10).index, -1, "no room");
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
