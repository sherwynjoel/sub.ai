import { test } from "node:test";
import assert from "node:assert/strict";
import { findText, insertAt, mergeCues, MIN_CAPTION, replaceText, retime, setText, setWord, shiftFrom, splitCue, stretchEnd } from "./cueEdit";

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

const row = (...spans: [number, number][]) => spans.map(([start, end], i) => ({ start, end, ta: `c${i}`, en: "" }));
const spans = (cues: { start: number; end: number }[]) => cues.map((c) => [c.start, c.end]);

test("retime: a caption between touching neighbours can grow, and they give up the time", () => {
  const c = row([0, 2], [2, 4], [4, 6]);
  assert.deepEqual(spans(retime(c, 1, 2, 5, 10)), [[0, 2], [2, 5], [5, 6]]);
  assert.deepEqual(spans(retime(c, 1, 1, 4, 10)), [[0, 1], [1, 4], [4, 6]]);
  assert.deepEqual(spans(c), [[0, 2], [2, 4], [4, 6]], "the original is left alone");
});

test("retime: moving a touching caption keeps its length, and opens a gap behind it", () => {
  assert.deepEqual(spans(retime(row([0, 2], [2, 4], [4, 6]), 1, 2.5, 4.5, 10)), [[0, 2], [2.5, 4.5], [4.5, 6]]);
  assert.deepEqual(spans(retime(row([0, 2], [2, 4], [4, 6]), 1, 1.5, 3.5, 10)), [[0, 1.5], [1.5, 3.5], [4, 6]]);
});

test("retime: a neighbour at its shortest is pushed along, and nothing leaves the video or overlaps", () => {
  const c = retime(row([0, 1], [1, 2], [2, 3]), 0, 0, 2.5, 3);
  assert.deepEqual(spans(c), [[0, 2.5], [2.5, 2.7], [2.7, 3]]);
  const far = retime(row([0, 1], [1, 2], [2, 3]), 0, 0, 99, 3);
  assert.equal(far[2].end, 3);
  assert.equal(far[0].end, 2.6);
  const back = retime(row([0, 1], [1, 2], [2, 3]), 2, -5, 3, 3);
  assert.deepEqual(spans(back), [[0, 0.2], [0.2, 0.4], [0.4, 3]]);
  for (const cs of [c, far, back]) cs.forEach((x, i) => {
    assert.ok(x.end - x.start >= MIN_CAPTION - 1e-9);
    if (i) assert.ok(cs[i - 1].end <= x.start + 1e-9);
  });
});

test("retime: a start typed past the end stops short of it, an end before the start too", () => {
  assert.deepEqual(spans(retime(row([1, 3]), 0, 9, 3, 10)), [[2.8, 3]]);
  assert.deepEqual(spans(retime(row([1, 3]), 0, 1, 0, 10)), [[1, 1.2]]);
});

test("retime: word times follow, the neighbours' too", () => {
  const c = [{ start: 0, end: 2, ta: "a b", en: "", w: [0, 1] }, { start: 2, end: 4, ta: "c d", en: "", w: [2, 3] }];
  const out = retime(c, 0, 0, 3, 10);
  assert.deepEqual(out[0].w, [0, 1.5]);
  assert.deepEqual(out[1].w, [3, 3.5]);
  assert.deepEqual(retime(c, 1, 3, 5, 10)[1].w, [3, 4]);
});

test("shiftFrom moves a caption and everything after it, gaps kept", () => {
  const c = row([0, 1], [2, 3], [4, 5]);
  assert.deepEqual(spans(shiftFrom(c, 1, 0.5, 10)), [[0, 1], [2.5, 3.5], [4.5, 5.5]]);
  assert.deepEqual(spans(shiftFrom(c, 1, -1.5, 10)), [[0, 0.5], [0.5, 1.5], [2.5, 3.5]], "earlier ones make room");
  const end = shiftFrom(c, 0, 9, 5.5);
  assert.equal(end[2].start, 5.3, "stops with the last one still on the video");
  assert.equal(end[2].end, 5.5);
  assert.equal(shiftFrom(c, 3, 1, 10), c);
});

test("stretchEnd keeps the gaps after it, both ways", () => {
  const c = row([0, 2], [3, 4], [5, 6]);
  assert.deepEqual(spans(stretchEnd(c, 0, 3, 10)), [[0, 3], [4, 5], [6, 7]]);
  assert.deepEqual(spans(stretchEnd(c, 0, 1, 10)), [[0, 1], [2, 3], [4, 5]]);
});

test("findText counts both lines in any case, and special characters are just text", () => {
  const c = [{ start: 0, end: 1, ta: "Ravi ரவி ravi", en: "ravi" }, { start: 1, end: 2, ta: "a.b", en: "" }, { start: 2, end: 3, ta: "axb", en: "" }];
  assert.deepEqual(findText(c, "RAVI"), { count: 3, where: [0] });
  assert.deepEqual(findText(c, "ரவி"), { count: 1, where: [0] });
  assert.deepEqual(findText(c, "a.b"), { count: 1, where: [1] });
  assert.deepEqual(findText(c, "  "), { count: 0, where: [] });
});

test("replaceText keeps word times when the word count holds, and $ is just a character", () => {
  const c = [{ start: 0, end: 2, ta: "ravi sir", en: "Ravi", w: [0, 1], wc: [null, "#ff0000"] }, { start: 2, end: 3, ta: "other", en: "" }];
  const out = replaceText(c, "ravi", "Raj$1");
  assert.deepEqual([out[0].ta, out[0].en, out[0].w, out[0].wc], ["Raj$1 sir", "Raj$1", [0, 1], [null, "#ff0000"]]);
  assert.equal(out[1], c[1], "captions without it are left alone");
  assert.equal(replaceText(c, " ", "x"), c);
});

test("replaceText with nothing takes the word out, leaving no double space", () => {
  assert.equal(replaceText([{ start: 0, end: 2, ta: "one um two", en: "" }], "um", "")[0].ta, "one two");
});
