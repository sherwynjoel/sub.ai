import { test } from "node:test";
import assert from "node:assert/strict";
import { assColor, buildAss, CAPTION_STYLES, keywordIndex, resolveStyle, SAFE_ZONES, sanitizeCustom, stackBig, stackChunks, styleOf, tamilRuns, wordTimes } from "./captionStyles";

test("assColor converts #RRGGBB[AA] to ASS &HAABBGGRR with inverted alpha", () => {
  assert.equal(assColor("#FFC83D"), "&H003DC8FF&");
  assert.equal(assColor("#FFFFFF00"), "&HFFFFFFFF&");
});

test("word timings fill the cue and the keyword is the longest word", () => {
  const w = wordTimes("ab abcd ab", 1, 3);
  assert.equal(w[0].s, 1);
  assert.ok(Math.abs(w[2].e - 3) < 1e-9);
  assert.equal(keywordIndex(w.map((x) => x.w)), 1);
});

test("every style builds a valid ASS script; word reveal hides words not yet spoken", () => {
  const cues = [{ start: 0, end: 2, ta: "இந்த song தான் favourite", en: "This song is my favourite" }];
  for (const s of CAPTION_STYLES) {
    const ass = buildAss(cues, { styleId: s.id, lang: "both", width: 1080, height: 1920 });
    assert.match(ass, /PlayResX: 1080/);
    assert.ok(ass.includes("Dialogue:"), s.id);
  }
  const box = buildAss(cues, { styleId: "word-box", lang: "ta", width: 1920, height: 1080 });
  const first = box.split("\n").find((l) => l.startsWith("Dialogue:"))!;
  assert.match(first, /\alpha&HFF&/); // later words invisible while the first is spoken
});

test("sanitizeCustom keeps valid edits and drops anything unsafe", () => {
  const c = sanitizeCustom({ font: "Anton", size: 9, color: "#ff0000", accent: "red", outline: null, box: "#000000", case: "upper", position: "top", offset: 0.1, evil: "<script>" });
  assert.deepEqual(c, { font: "Anton", size: 2.6, color: "#ff0000", outline: null, box: "#000000", case: "upper", position: "top", offset: 0.1 });
  assert.deepEqual(sanitizeCustom({ font: "Comic Sans" }), {});
  assert.deepEqual(sanitizeCustom("nope"), {});
});

test("custom edits layer on a style and reach the MP4 subtitles", () => {
  const r = resolveStyle("comic-pop", { font: "Satisfy", accent: "#00ff00", outline: null, position: "top", offset: 0.1 });
  assert.equal(r.font, "Satisfy");
  assert.equal(r.keyword?.color, "#00ff00");
  assert.equal(r.outline, undefined);
  assert.equal(styleOf("comic-pop").keyword?.color, "#FFC83D"); // the preset itself is untouched
  const ass = buildAss([{ start: 0, end: 2, ta: "hello world", en: "" }], { styleId: "comic-pop", custom: { font: "Satisfy", position: "top", offset: 0.1 }, lang: "ta", width: 1920, height: 1080 });
  assert.match(ass, /Style: Main,Satisfy,/);
  assert.match(ass, /,8,\d+,\d+,108,1\n/); // top alignment, 10% margin
});

test("the lines setting reaches the MP4 subtitles", () => {
  const cues = [{ start: 0, end: 2, ta: "one two three four", en: "" }];
  const two = buildAss(cues, { styleId: "minimal", custom: { lines: 2 }, lang: "ta", width: 1920, height: 1080 });
  assert.match(two, /two\\N\{/); // break after "two"
  const one = buildAss(cues, { styleId: "minimal", custom: { lines: 1 }, lang: "ta", width: 1920, height: 1080 });
  assert.match(one, /\{\\q2\}/); // no auto-wrap
  assert.deepEqual(sanitizeCustom({ lines: 2 }), { lines: 2 });
  assert.deepEqual(sanitizeCustom({ lines: 7 }), {});
});

test("a dragged placement is clamped and reaches the MP4 as \\pos", () => {
  assert.deepEqual(sanitizeCustom({ x: 0.25, y: 1.7 }), { x: 0.25, y: 1 });
  const ass = buildAss([{ start: 0, end: 1, ta: "hi there", en: "" }], { styleId: "minimal", custom: { x: 0.25, y: 0.5 }, lang: "ta", width: 1920, height: 1080 });
  assert.match(ass, /\{\\an5\\pos\(480,540\)\}/);
});

test("safe zones keep captions inside the platform's clear area", () => {
  // TikTok: bottom band and right-side buttons are excluded.
  const s = resolveStyle("minimal", { safe: "tiktok" }, true);
  assert.deepEqual(s.safe, SAFE_ZONES.tiktok.m);
  assert.ok(s.offset >= SAFE_ZONES.tiktok.m.bottom, "bottom caption sits above the bottom band");
  assert.ok(resolveStyle("minimal", { safe: "tiktok", position: "top" }, true).offset >= SAFE_ZONES.tiktok.m.top);
  // A dragged caption is pulled back inside the zone.
  const d = resolveStyle("minimal", { safe: "tiktok", x: 0.99, y: 0.99 }, true);
  assert.ok(d.x! <= 1 - SAFE_ZONES.tiktok.m.right && d.y! <= 1 - SAFE_ZONES.tiktok.m.bottom);
  // No zone: today's behaviour (7% side margins).
  assert.deepEqual(resolveStyle("minimal", {}).safe, SAFE_ZONES.none.m);
  // Custom margins are clamped; unknown presets dropped.
  assert.deepEqual(sanitizeCustom({ safe: "custom", safeCustom: { top: 0.1, right: 0.9, bottom: -1, left: 0.05 } }), { safe: "custom", safeCustom: { top: 0.1, right: 0.4, bottom: 0, left: 0.05 } });
  assert.deepEqual(sanitizeCustom({ safe: "myspace" }), {});
  assert.deepEqual(resolveStyle("minimal", { safe: "custom", safeCustom: { top: 0.1, right: 0.2, bottom: 0.3, left: 0.05 } }).safe, { top: 0.1, right: 0.2, bottom: 0.3, left: 0.05 });
  // The MP4 subtitles wrap inside the zone and sit above its bottom band.
  const ass = buildAss([{ start: 0, end: 2, ta: "வணக்கம்", en: "Hello" }], { styleId: "minimal", custom: { safe: "tiktok" }, lang: "ta", width: 1080, height: 1920 });
  const main = ass.split("\n").find((l) => l.startsWith("Style: Main"))!.split(",");
  const [ml, mr, mv] = main.slice(-4, -1).map(Number);
  assert.equal(ml, Math.round(1080 * SAFE_ZONES.tiktok.m.left));
  assert.equal(mr, Math.round(1080 * SAFE_ZONES.tiktok.m.right));
  assert.ok(mv >= Math.round(1920 * SAFE_ZONES.tiktok.m.bottom));
});

test("stack styles: a few words a piece, small / big / small, English on the bottom line", () => {
  const p = stackChunks("a bb ccc dddd eeeee", "", 0, 10);
  assert.deepEqual(p.map((c) => c.parts), [["a", "bb", "ccc"], ["dddd", "eeeee", ""]]);
  assert.deepEqual([p[0].s, p[1].e], [0, 10]);
  assert.deepEqual(stackChunks("ஒன்று இரண்டு மூன்று", "one two three four", 0, 4).map((c) => c.parts), [["ஒன்று", "இரண்டு", "one two"], ["", "மூன்று", "three four"]]);
  assert.equal(stackChunks("a b c d e f g h i", "", 0, 1.5).length, 1, "a short cue keeps one piece on screen long enough to read");
  const ass = buildAss([{ start: 0, end: 3, ta: "நான் எப்பவுமே சூப்பரான", en: "I always" }], { styleId: "trending-1", lang: "both", width: 1080, height: 1920 });
  assert.match(ass, /\\fnAnton/); assert.match(ass, /எப்பவுமே/); assert.match(ass, /always/);
  assert.ok(stackBig("பரிந்துரைக்கப்பட்டது") < stackBig("Hi"));
});

test("tamilRuns puts Tamil in the Tamil font and returns to the font in effect", () => {
  const fonts = { Main: "Anton", Second: "Poppins" };
  assert.equal(tamilRuns("Hi வணக்கம் you", fonts, "Main"), "Hi {\\fnNoto Sans Tamil}வணக்கம் {\\fnAnton}you");
  assert.equal(tamilRuns("{\\fnBangers}வணக்கம்\\N{\\rSecond}hello", fonts, "Main"), "{\\fnBangers}{\\fnNoto Sans Tamil}வணக்கம்{\\fnBangers}\\N{\\rSecond}hello");
  assert.equal(tamilRuns("plain", fonts, "Main"), "plain");
});

test("text controls and entrances reach the MP4", () => {
  const ass = buildAss([{ start: 0, end: 2, ta: "hello world", en: "hi" }], {
    styleId: "minimal", lang: "both", width: 1080, height: 1920,
    custom: { bold: true, spacing: 0.1, rotate: 10, opacity: 0.5, shadowColor: "#ff0000", shadowSize: 0.1, anim: "pop", highlight: "grow" },
  });
  const style = ass.split("\n").find((l) => l.startsWith("Style: Main"))!.split(",");
  assert.equal(style[7], "-1", "bold");
  assert.equal(style[13], String(Math.round(0.1 * 81 * 10) / 10), "letter spacing");
  assert.equal(style[14], "-10", "rotation");
  assert.match(style[3], /^&H(7F|80)/, "half opacity");
  const first = ass.split("\n").find((l) => l.startsWith("Dialogue"))!;
  assert.match(first, /\\fscx60\\fscy60\\t\(0,\d+,\\fscx100\\fscy100\)/, "pop on the first event");
  assert.match(first, /\\frz-10/, "the English line turns with it");
  assert.match(ass, /\\t\(0,120,\\fscx115\\fscy115\)/, "the spoken word grows");
  const slide = buildAss([{ start: 0, end: 2, ta: "hello", en: "" }], { styleId: "minimal", lang: "ta", width: 1080, height: 1920, custom: { anim: "slide" } });
  assert.match(slide, /\\move\(540,\d+,540,\d+,0,\d+\)/);
});
