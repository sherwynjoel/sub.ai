import { test } from "node:test";
import assert from "node:assert/strict";
import { toSrt, toVtt, mergeChunks, pairChunks, splitLine, layoutCue, divide, naturalBreak, shiftCues, breakLines, snapToPauses, wordStarts, retimeWindows, englishCues, translateBySentence, mergeShort } from "./subtitles";
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

test("pairChunks matches the two Saaras passes by time and never leaves a cue with one language", () => {
  const p = (start: number, end: number, text: string) => ({ start, end, text });
  // Same cuts: paired one to one, native timing kept.
  assert.deepEqual(pairChunks([p(0, 2, "வணக்கம்"), p(2, 4, "நன்றி")], [p(0, 2.1, "Hello"), p(2.1, 4, "Thanks")]),
    [{ start: 0, end: 2, ta: "வணக்கம்", en: "Hello" }, { start: 2, end: 4, ta: "நன்றி", en: "Thanks" }]);
  // English came back as one phrase over two native ones: its words are shared by duration.
  assert.deepEqual(pairChunks([p(0, 1, "அ"), p(1, 4, "ஆ")], [p(0, 4, "one two three four")]),
    [{ start: 0, end: 1, ta: "அ", en: "one" }, { start: 1, end: 4, ta: "ஆ", en: "two three four" }]);
  // Native has fewer phrases: English timing leads and the native words are shared.
  assert.deepEqual(pairChunks([p(0, 4, "அ ஆ")], [p(0, 2, "a"), p(2, 4, "b")]),
    [{ start: 0, end: 2, ta: "அ", en: "a" }, { start: 2, end: 4, ta: "ஆ", en: "b" }]);
  // Fewer words than phrases: the short cue folds into its neighbour instead of showing one language.
  const folded = pairChunks([p(0, 1, "அ"), p(1, 2, "ஆ"), p(2, 3, "இ")], [p(0, 3, "x y")]);
  assert.ok(folded.every((c) => c.ta && c.en), JSON.stringify(folded));
  assert.equal(folded.map((c) => c.ta).join(" "), "அ ஆ இ");
  assert.equal(folded.map((c) => c.en).join(" "), "x y");
  // One side empty (music): nothing to pair, nothing invented.
  assert.deepEqual(pairChunks([], []), []);
  // No English pass was run: every phrase stays its own cue with an empty English line, nothing folds together.
  assert.deepEqual(pairChunks([p(0, 2, "அ"), p(2, 4, "ஆ")], []), [{ start: 0, end: 2, ta: "அ", en: "" }, { start: 2, end: 4, ta: "ஆ", en: "" }]);
  assert.deepEqual(layoutCue({ start: 0, end: 4, ta: "அ ஆ. இ ஈ.", en: "" }).map((c) => [c.ta, c.en]), [["அ ஆ.", ""], ["இ ஈ.", ""]]);
});

test("splitLine breaks long lines at sentences then words and shares the time by length", () => {
  const parts = splitLine("Starting from 499. So comment Stree, or check the link in the bio for every material.", 30, 37);
  assert.ok(parts.every((p) => p.text.length <= 42), JSON.stringify(parts));
  assert.equal(parts[0].text, "Starting from 499.");
  assert.equal(parts[0].start, 30);
  assert.ok(Math.abs(parts.at(-1)!.end - 37) < 1e-9);
  assert.deepEqual(splitLine("Short line.", 1, 2), [{ start: 1, end: 2, text: "Short line." }]);
});

test("layoutCue pairs sentences, shares words where the passes punctuate differently, and keeps the window's time", () => {
  const out = layoutCue({ start: 10, end: 20, ta: "நான் சொல்லட்டுமா? மறக்காம page-ஐ follow பண்ணிக்கோங்க.", en: "Shall I tell you? Don't forget to follow our page." });
  assert.deepEqual(out.map((c) => [c.ta, c.en]), [["நான் சொல்லட்டுமா?", "Shall I tell you?"], ["மறக்காம page-ஐ follow பண்ணிக்கோங்க.", "Don't forget to follow our page."]]);
  assert.equal(out[0].start, 10);
  assert.ok(Math.abs(out.at(-1)!.end - 20) < 1e-9);
  // One Tamil sentence came back as two English ones: the words are shared, nothing dropped, both languages everywhere.
  const mixed = layoutCue({ start: 0, end: 4, ta: "ஒன்று இரண்டு மூன்று நான்கு.", en: "One two. Three four." });
  assert.equal(mixed.map((c) => c.en).join(" "), "One two. Three four.");
  assert.ok(mixed.every((c) => c.ta && c.en), JSON.stringify(mixed));
});

test("divide shares a translation across pieces by weight, never leaving a piece empty", () => {
  assert.deepEqual(divide("one two three four", [1, 1]), ["one two", "three four"]);
  assert.deepEqual(divide("one two three four", [3, 1]), ["one two three", "four"]);
  assert.deepEqual(divide("hello", [1]), ["hello"]);
  assert.ok(divide("a b c", [1, 1, 1]).every((p) => p.length > 0));
});

test("shiftCues moves cues onto a timeline and drops ones trimmed off the head", () => {
  const cues = [{ start: 0, end: 1, ta: "a", en: "a" }, { start: 2, end: 3, ta: "b", en: "b" }];
  assert.deepEqual(shiftCues(cues, 10).map((c) => c.start), [10, 12]);
  assert.deepEqual(shiftCues(cues, -1.5), [{ start: 0.5, end: 1.5, ta: "b", en: "b" }]);
});

test("breakLines lays text out on balanced lines, never more lines than words", () => {
  assert.equal(breakLines("one two three four", 2), "one two\nthree four");
  assert.equal(breakLines("one two three four five six", 3), "one two\nthree four\nfive six");
  assert.equal(breakLines("hi", 3), "hi");
  assert.equal(breakLines("one two three four", undefined), "one two three four");
  const srt = toSrt([{ start: 0, end: 1, ta: "one two three four", en: "a b" }], "both", 2).split("\n");
  assert.deepEqual(srt.slice(2, 6), ["one two", "three four", "a", "b"]);
});

test("divide cuts a translation at a phrase edge near the length-based point, never mid-phrase when one is close", () => {
  assert.deepEqual(divide("They would say that I always prefer cotton materials", [1, 1]), ["They would say", "that I always prefer cotton materials"]);
  assert.deepEqual(divide("But if you ask what cotton, they won't have an awareness", [1, 1]), ["But if you ask what cotton,", "they won't have an awareness"]);
  assert.deepEqual(divide("one two three four", [1, 1]), ["one two", "three four"], "no phrase edge nearby: unchanged");
  // Punctuation wins over a clause word; nothing more than 2 words from the length-based point.
  assert.equal(naturalBreak("a b c, d and e f g".split(" "), 4, 1, 7), 3);
  assert.equal(naturalBreak("a b c d e f g h, i".split(" "), 3, 1, 9), 3, "the comma is too far away");
});

test("snapToPauses moves a back-to-back cut to the nearby pause and keeps real gaps", () => {
  const level = Array.from({ length: 300 }, (_, f) => (f >= 118 && f <= 124 ? -50 : -15)); // 10 ms frames, pause at 1.18-1.24 s
  const out = snapToPauses([cue(0, 1.5), cue(1.5, 3), cue(3.2, 4)], level, 0.01);
  assert.ok(Math.abs(out[0].end - 1.21) < 0.03 && out[1].start === out[0].end);
  assert.deepEqual([out[1].end, out[2].start], [3, 3.2]);
  // No pause nearby: the cut stays.
  assert.equal(snapToPauses([cue(0, 1.5), cue(1.5, 3)], new Array(300).fill(-15), 0.01)[0].end, 1.5);
});

test("wordStarts shares the line over the time with speech in it, so words after a pause start when it resumes", () => {
  // 0-2 s speech, 2-5 s pause, 5-7 s speech (20 ms frames); four equal words, two on each side of the pause.
  const level = Array.from({ length: 400 }, (_, f) => (f * 0.02 < 2 || f * 0.02 >= 5 ? -15 : -50));
  const w = wordStarts("aaaa bbbb cccc dddd", 0, 7, level, 0.02);
  assert.equal(w[0], 0);
  assert.ok(w[1] > 0.8 && w[1] < 1.3, `second word mid first stretch: ${w[1]}`);
  assert.ok(w[2] >= 4.9 && w[2] < 5.4, `third word when speech resumes, not in the pause: ${w[2]}`);
  assert.ok(w[3] > 5.6 && w[3] < 6.4, `${w[3]}`);
  // By length alone the third word would sit at 3.5 s, in the middle of the pause.
});

test("retimeWindows moves the cuts inside a model window to where their first word is said", () => {
  // Window 0-7 s: speech 0-2 s and 5-7 s. Two cues of equal length: by length the cut is at 3.5 s, in the pause.
  const level = Array.from({ length: 400 }, (_, f) => (f * 0.02 < 2 || f * 0.02 >= 5 ? -15 : -50));
  const cues = [{ ...cue(0, 3.5, "aaaa bbbb", ""), anchor: true }, cue(3.5, 7, "cccc dddd", "")];
  const out = retimeWindows(cues, level, 0.02);
  assert.ok(out[1].start >= 4.9 && out[1].start < 5.4 && out[0].end === out[1].start, `cut at ${out[1].start}`);
  // Not from a window (no anchor): left alone.
  assert.equal(retimeWindows([cue(0, 3.5, "aaaa bbbb", ""), cue(3.5, 7, "cccc dddd", "")], level, 0.02)[1].start, 3.5);
});

test("englishCues: whole sentences from an English line shared across the Tamil captions", () => {
  const cues = [
    { start: 0, end: 1.6, ta: "இப்போ சில patients கேக்குறாங்க sir,", en: "Now some patients are asking, sir," },
    { start: 1.6, end: 4.0, ta: "எனக்கும் ஒரே மாதிரி", en: "I also got acne in the same" },
    { start: 4.0, end: 4.3, ta: "என்", en: "way," },
    { start: 4.3, end: 5.6, ta: "friend-க்கும்", en: "and my friend also got it." },
    { start: 9, end: 10, ta: "அடுத்து", en: "Next." },
  ];
  const out = englishCues(cues);
  assert.deepEqual(out.map((c) => c.en), [
    "Now some patients are asking, sir, I also got acne in the same way,",
    "and my friend also got it.",
    "Next.",
  ]);
  assert.equal(out[0].start, 0);
  assert.equal(out[1].end, 5.6);
  assert.deepEqual([out[2].start, out[2].end], [9, 10], "a gap starts a new stretch");
  assert.ok(out.every((c) => c.ta === "" && c.we!.length === c.en.split(" ").length));
});

test("translateBySentence: each native sentence translated on its own, its English shared across its captions", async () => {
  const cues = [
    { start: 0, end: 2, ta: "இப்போ treatment earlier-ஆ start பண்ணும்போது", en: "", anchor: true },
    { start: 2, end: 4, ta: "நம்ம acne-யோட inflammation ரொம்ப நிறைய இருக்காது,", en: "" },
    { start: 4, end: 5.5, ta: "scars இல்லாம heal ஆயிரும்.", en: "" },
    { start: 5.5, end: 6.2, ta: "So சில பேத்துக்கு", en: "", anchor: true },
  ];
  const asked: string[] = [];
  const out = await translateBySentence(cues, async (t) => {
    asked.push(t);
    return t.startsWith("So") ? "So for some people" : "When we start treatment early, the inflammation won't be much. It heals without scars.";
  });
  assert.equal(asked.length, 2, "one request per sentence; a new window starts a new one");
  assert.equal(out.slice(0, 3).map((c) => c.en).join(" "), "When we start treatment early, the inflammation won't be much. It heals without scars.");
  assert.equal(out[3].en, "So for some people", "the next sentence keeps its own English");
  assert.ok(out.slice(0, 3).every((c) => c.en), "every caption of the sentence gets some English");
});

test("mergeShort: a caption too short to read joins the neighbour it runs into", () => {
  const out = mergeShort([cue(0, 2, "a b c", "x y z"), cue(2, 2.3, "d", "w"), cue(2.3, 5, "e f g h i j", "v u t s"), cue(8, 8.2, "k", "q")]);
  assert.deepEqual(out.map((c) => [c.start, c.end, c.ta, c.en]), [[0, 2.3, "a b c d", "x y z w"], [2.3, 5, "e f g h i j", "v u t s"], [8, 8.2, "k", "q"]]);
});
