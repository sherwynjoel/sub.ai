import { test } from "node:test";
import assert from "node:assert/strict";
import { assColor, buildAss, CAPTION_STYLES, keywordIndex, resolveStyle, sanitizeCustom, styleOf, wordTimes } from "./captionStyles";

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
  const r = resolveStyle("comic-pop", { font: "Fraunces", accent: "#00ff00", outline: null, position: "top", offset: 0.1 });
  assert.equal(r.font, "Fraunces");
  assert.equal(r.keyword?.color, "#00ff00");
  assert.equal(r.outline, undefined);
  assert.equal(styleOf("comic-pop").keyword?.color, "#FFC83D"); // the preset itself is untouched
  const ass = buildAss([{ start: 0, end: 2, ta: "hello world", en: "" }], { styleId: "comic-pop", custom: { font: "Fraunces", position: "top", offset: 0.1 }, lang: "ta", width: 1920, height: 1080 });
  assert.match(ass, /Style: Main,Fraunces,/);
  assert.match(ass, /,8,\d+,\d+,108,1\n/); // top alignment, 10% margin
});
