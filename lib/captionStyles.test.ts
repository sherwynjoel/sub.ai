import { test } from "node:test";
import assert from "node:assert/strict";
import { cornerRows, hookChunks, hookFit, revealUnits, typoSize } from "./captionStyles";
import { assColor, buildAss, CAPTION_STYLES, DEFAULT_STYLE, STYLE_CHOICES, STYLE_GROUPS, keywordIndex, resolveStyle, SAFE_ZONES, sanitizeCustom, stackBig, stackChunks, styleOf, tamilRuns, wordTimes, takesLineSpacing } from "./captionStyles";

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
  const s = resolveStyle("minimal", { safe: "tiktok" }, true), t = SAFE_ZONES.tiktok.m;
  // Centred: both sides keep the larger side margin (the buttons' side), so the caption isn't pushed off-centre.
  assert.deepEqual(s.safe, { ...t, left: t.right, right: t.right });
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
  assert.deepEqual(resolveStyle("minimal", { safe: "custom", safeCustom: { top: 0.1, right: 0.2, bottom: 0.3, left: 0.05 } }).safe, { top: 0.1, right: 0.2, bottom: 0.3, left: 0.2 });
  // The MP4 subtitles wrap inside the zone and sit above its bottom band.
  const ass = buildAss([{ start: 0, end: 2, ta: "வணக்கம்", en: "Hello" }], { styleId: "minimal", custom: { safe: "tiktok" }, lang: "ta", width: 1080, height: 1920 });
  const main = ass.split("\n").find((l) => l.startsWith("Style: Main"))!.split(",");
  const [ml, mr, mv] = main.slice(-4, -1).map(Number);
  assert.equal(ml, Math.round(1080 * SAFE_ZONES.tiktok.m.right), "the same margin both sides: centred");
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
  // A word the user coloured (Highlight) keeps its colour in its piece: here the big word and a small one.
  assert.deepEqual(p.map((c) => c.idx), [[[0], 1, [2]], [[3], 4, []]]);
  const hl = buildAss([{ start: 0, end: 3, ta: "a bb ccc", en: "", wc: [null, "#00FF00", "#FF0000"] }], { styleId: "trending-1", lang: "ta", width: 1080, height: 1920 });
  assert.match(hl, /\\1c&H00FF00&[^}]*}(\{\\fs[\d.]+\})?bb/, "the big word in its own colour (its font sized as it switches)");
  assert.match(hl, /\\1c&H0000FF&}ccc/, "a small word in its own colour");
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
  const fs = Math.round(1080 * 0.075 * resolveStyle("minimal").size! * 10) / 10; // the editor's em, in pixels
  assert.equal(style[13], String(Math.round(0.1 * fs * 10) / 10), "letter spacing");
  assert.equal(style[14], "-10", "rotation");
  assert.match(style[3], /^&H(7F|80)/, "half opacity");
  const first = ass.split("\n").find((l) => l.startsWith("Dialogue"))!;
  assert.match(first, /\\fscx60\\fscy60\\t\(0,\d+,\\fscx100\\fscy100\)/, "pop on the first event");
  assert.match(first, /\\frz-10/, "the English line turns with it");
  assert.match(ass, /\\t\(0,120,\\fscx115\\fscy115\)/, "the spoken word grows");
  const slide = buildAss([{ start: 0, end: 2, ta: "hello", en: "" }], { styleId: "minimal", lang: "ta", width: 1080, height: 1920, custom: { anim: "slide" } });
  assert.match(slide, /\\move\(540,\d+,540,\d+,0,\d+\)/);
});

test("canvas, text layers and emoji reach the MP4; project-only settings stay out of a caption's look", async () => {
  const { canvasSize, ownLook } = await import("./captionStyles");
  assert.deepEqual(canvasSize({ ratio: "9:16", fit: "fit", bg: "blur" }, 1920, 1080), { width: 1080, height: 1920 });
  assert.deepEqual(canvasSize(undefined, 1280, 720), { width: 1280, height: 720 });
  const custom = sanitizeCustom({ canvas: { ratio: "1:1", fit: "fill", bg: "#123456" }, layers: [{ text: "Hi 🔥", start: 1, end: 3, x: 0.2, y: 0.3, style: { size: 1.5, canvas: { ratio: "9:16" } } }, { text: " ", start: 0, end: 1 }], logo: { ext: "png", x: 0.9, y: 0.1, size: 0.2, opacity: 0.5 } });
  assert.equal(custom.layers!.length, 1, "empty layers dropped");
  assert.equal(custom.layers![0].style!.canvas, undefined, "a layer's look has no canvas");
  assert.deepEqual(custom.canvas, { ratio: "1:1", fit: "fill", bg: "#123456" });
  assert.equal(ownLook({ size: 1.2, logo: { ext: "png" } }).logo, undefined);
  const ass = buildAss([], { styleId: "minimal", custom, lang: "ta", width: 1080, height: 1080 });
  const layer = ass.split("\n").find((l) => l.startsWith("Dialogue"))!;
  assert.match(layer, /^Dialogue: 5,0:00:01\.00,0:00:03\.00,L1,/);
  assert.match(layer, /\\pos\(216,324\)/);
  assert.match(layer, /\\fnNoto Emoji(\\fs[\d.]+)?\}🔥/, "emoji in the one-colour emoji font");
  const em = Math.round(1080 * 0.075 * resolveStyle("minimal", { size: 1.5 }).size! * 10) / 10; // 150% of the standard
  assert.match(ass, new RegExp(`Style: L1,Poppins ExtraBold,${Math.round(em * 1.762 * 10) / 10},`), "the layer's own size (em × the font's line height)");
});

test("styles on offer: the chosen 20, the template pack's 16 and the CINECUT project's 8, with the default among them", () => {
  assert.equal(STYLE_CHOICES.length, 44);
  assert.equal(STYLE_CHOICES.filter((s) => s.group === "Templates").length, 16);
  assert.equal(STYLE_CHOICES.filter((s) => s.group === "Typography").length, 8);
  assert.equal(STYLE_GROUPS[0], "Typography");
  assert.ok(STYLE_CHOICES.some((s) => s.id === DEFAULT_STYLE));
  assert.ok(!STYLE_GROUPS.includes("Playful"), "a group with nothing on offer isn't shown");
  assert.equal(styleOf("minimal").name, "Plain Bold", "projects on a style no longer offered keep it");
});

test("template pack: hooks cut a caption into pieces of lines that take the sizes and colours in turn", () => {
  const p = hookChunks("You might be missing this part today", 0, 4);
  assert.equal(p.length, 2);
  assert.deepEqual(p[0].lines.map((l) => l.text), ["You", "might", "be", "missing"].slice(0, p[0].lines.length));
  assert.deepEqual(p.flatMap((x) => x.lines.flatMap((l) => l.idx)), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(hookFit("missing", 2, 99), 2);
  assert.ok(hookFit("a very long line of words here", 2, 10) < 1, "a long line shrinks to fit");
  const ass = buildAss([{ start: 0, end: 2, ta: "You might be missing", en: "" }], { styleId: "tpl-hook-yellow", lang: "ta", width: 1080, height: 1920 });
  const third = Math.round(styleOf("tpl-hook-yellow").hook!.sizes[2] * 100);
  assert.match(ass, new RegExp(`\\\\fscx${third}\\\\fscy${third}\\\\1c&H00EDFF&`), "the third line big and in the hook's yellow");
  assert.match(ass, /\\t\(120,300,\\alpha&H00&/, "lines come in one after another");
});

test("template pack: new entrances in the MP4", () => {
  const ass = (anim: string) => buildAss([{ start: 0, end: 2, ta: "hello there world", en: "" }], { styleId: "minimal", custom: { anim: anim as never }, lang: "ta", width: 1080, height: 1920 });
  assert.match(ass("blur"), /\\blur[\d.]+\\t\(0,\d+,\\blur0\)/);
  assert.match(ass("flicker"), /\\t\(50,51,\\alpha&H00&\)/);
  assert.match(ass("snap"), /\\fscx150\\fscy150/);
  assert.match(ass("bouncyout"), /\\fad\(0,250\)/, "fades out at the end");
  assert.match(ass("wordin"), /\\alpha&HFF&\\blur[\d.]+\\t\(0,160/, "each word blurs in");
  const rgb = buildAss([{ start: 0, end: 2, ta: "it rewards strategy", en: "" }], { styleId: "tpl-reels-rgb", lang: "ta", width: 1080, height: 1920 });
  assert.equal((rgb.match(/^Dialogue/gm) ?? []).length % 3, 0, "the big word in red and cyan behind it");
});

test("CINECUT typography: words (or letters) come in each in a layer of its own, in place", () => {
  const cue = [{ start: 0, end: 3, ta: "slide up effect", en: "" }];
  const dlg = (id: string) => buildAss(cue, { styleId: id, lang: "ta", width: 1080, height: 1920 }).split("\n").filter((l) => l.startsWith("Dialogue"));
  const rise = dlg("cc-rise");
  assert.equal(rise.length, 3, "a layer a word");
  assert.ok(rise.every((l) => /\\move\(540,\d+,540,\d+,0,270\)/.test(l)), "each rises into place");
  assert.ok(rise.every((l) => l.replace(/\{[^}]*\}/g, "") .endsWith("slide up effect")), "the same text in every layer");
  assert.equal(dlg("cc-letter-rise").length, "slideupeffect".length, "a layer a letter");
  assert.ok(dlg("cc-bold-flicker").every((l) => /\\t\(40,41,\\alpha&H00&\)/.test(l)), "each word flickers on");
  const corners = dlg("cc-corners");
  assert.deepEqual(corners.map((l) => l.match(/\\an(\d)/)![1]), ["7", "9", "7"], "pairs pinned left and right");
  assert.equal(dlg("cc-word-cut").length, 3, "one word at a time");
  assert.deepEqual(revealUnits([{ w: "hi", s: 1, e: 2 }, { w: "வணக்கம்", s: 2, e: 3 }], true).map((u) => [u.j, u.k]), [[0, 0], [0, 1], [1, null]], "letters only in Latin words");
  assert.deepEqual([0, 1, 2, 3, 4].map(typoSize), [0.55, 1.5, 0.55, 0.55, 1.5]);
  assert.deepEqual(cornerRows([1, 2, 3]), [[1, 2], [3]]);
});

test("the MP4 draws every font at the editor's size: its ASS size is em × the font's line height", () => {
  const ass = buildAss([{ start: 0, end: 2, ta: "இந்த song", en: "" }], { styleId: "tall-caps", lang: "ta", width: 1080, height: 1920 });
  const em = Math.round(1080 * 0.075 * styleOf("tall-caps").size! * 10) / 10; // tall-caps: Anton
  assert.match(ass, new RegExp(`Style: Main,Anton,${Math.round(em * 1.733 * 10) / 10},`), "Anton sized by its line height");
  assert.match(ass, new RegExp(`\\\\fnMukta Malar ExtraBold\\\\fs${Math.round(em * 1.662 * 10) / 10}`), "the Tamil letters by their font's");
});

test("every style starts at the standard size, in any font or case; the user's size is relative to it", async () => {
  const { looksTall } = await import("./fontWidths");
  const looks = (s: { font: string; caps?: boolean; size?: number }) => looksTall(s.font, s.caps) * (s.size ?? 1);
  const standard = looksTall("Inter Bold") * 1.1;
  for (const st of STYLE_CHOICES) {
    const r = resolveStyle(st.id);
    assert.ok(Math.abs(looks(r) / standard - 1) < 0.02, `${st.id} looks ${(looks(r) / standard * 100).toFixed(0)}% of standard`);
    assert.equal(r.scale, 1);
    const anton = resolveStyle(st.id, { font: "Anton", case: "upper" });
    assert.ok(Math.abs(looks(anton) / standard - 1) < 0.02, `${st.id} in Anton caps`);
    const big = resolveStyle(st.id, { size: 1.5 });
    assert.ok(Math.abs(looks(big) / standard - 1.5) < 0.03, `${st.id} at 150%`);
    assert.equal(big.scale, 1.5);
  }
});

test("line spacing: kept for the whole project, each line placed by the MP4 g line-heights apart, the anchor line still", async () => {
  const { ownLook: own, lineBox: box, lineCount: count } = await import("./captionStyles");
  assert.equal(sanitizeCustom({ lineHeight: 9 }).lineHeight, 2.5);
  assert.equal(own({ lineHeight: 1.5, size: 1.2 }).lineHeight, undefined, "not a single caption's: one spacing per project");
  const cue = { start: 0, end: 4, ta: "Hello there friends how are you all today", en: "" };
  const at = (g: number) => buildAss([cue], { styleId: "tpl-blur", lang: "ta", width: 1080, height: 1920, custom: { lineHeight: g } })
    .split("\n").filter((l) => l.startsWith("Dialogue: 0,0:00:00.00,")).map((l) => +l.match(/\\pos\(\d+,(\d+)\)/)![1]);
  const s = resolveStyle("tpl-blur"), em = 1080 * 0.075 * (s.size ?? 1), n = count(s, "Hello there friends how are you all today", 1080 / 1920);
  for (const g of [0.7, 1.5, 2]) {
    const ys = at(g);
    assert.equal(ys.length, n, `${n} lines, each its own event`);
    for (let k = 1; k < ys.length; k++) assert.ok(Math.abs(ys[k] - ys[k - 1] - em * box(s, "Hello") * g) <= 1, `lines ${g}× apart`);
  }
  assert.equal(at(2).at(-1), at(1.5).at(-1), "a bottom caption's last line stays put");
  const plain = buildAss([cue], { styleId: "tpl-blur", lang: "ta", width: 1080, height: 1920 });
  assert.ok(!/\\an5\\pos/.test(plain), "no spacing set: libass lays the lines out as before");
  const hook = buildAss([cue], { styleId: "tpl-hook-yellow", lang: "ta", width: 1080, height: 1920, custom: { lineHeight: 2 } });
  assert.equal(hook, buildAss([cue], { styleId: "tpl-hook-yellow", lang: "ta", width: 1080, height: 1920 }), "styles with their own layout keep it");
});

test("Word Cut picks out no word: no highlight, keyword colour or hand-coloured word, in the MP4 too", async () => {
  const { highlights } = await import("./captionStyles");
  assert.equal(highlights(resolveStyle("cc-word-cut")), false);
  assert.equal(highlights(resolveStyle("comic-pop")), true, "other styles keep theirs");
  const s = resolveStyle("cc-word-cut", { highlight: "box", accent: "#ff0000" });
  assert.equal(s.mark, undefined); assert.equal(s.active, undefined);
  const ass = buildAss([{ start: 0, end: 2, ta: "one two", en: "", wc: ["#ff0000", null] }], { styleId: "cc-word-cut", lang: "ta", width: 1080, height: 1920, custom: { highlight: "color", accent: "#00ff00" } });
  assert.ok(!/\\1c&H0000FF&|\\1c&H00FF00&/.test(ass), "neither the picked word's red nor the highlight green");
});

test("gradient: each line drawn in strips from the top colour to the bottom, the spoken word keeps its colour", async () => {
  const { mixHex } = await import("./captionStyles");
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
  // every style: its text in strips (each strip its own colour), the English solid (a stack's English is one of its lines)
  for (const st of CAPTION_STYLES) for (const lang of ["ta", "both"] as const) {
    const g = buildAss([{ start: 0, end: 2, ta: "one two three four five six", en: "one two" }], { styleId: st.id, lang, width: 1080, height: 1920, custom: { gradient: ["#ff0000", "#0000ff"] } });
    const ev = g.split("\n").filter((l) => l.startsWith("Dialogue"));
    assert.ok(ev.some((l) => /\\clip\(0,-?\d+,1080,-?\d+\)[^}]*\\1c&H0000FF&/.test(l)), `${st.id}: a top strip in the top colour`);
    assert.ok(ev.some((l) => /\\clip\(0,-?\d+,1080,-?\d+\)[^}]*\\1c&HFF0000&/.test(l)), `${st.id}: a bottom strip in the bottom colour`);
    if (lang === "both" && st.effect !== "stack") assert.ok(ev.some((l) => /,Main,|,C\d/.test(l) && /Second/.test(l) && !/\\clip/.test(l)), `${st.id}: the English solid`);
  }
  assert.deepEqual(sanitizeCustom({ gradient: ["#ff0000", "#0000ff"] }).gradient, ["#ff0000", "#0000ff"]);
  assert.equal(sanitizeCustom({ gradient: ["red", "#0000ff"] }).gradient, undefined, "only colours");
  const ass = buildAss([{ start: 0, end: 2, ta: "one two", en: "" }], { styleId: "tpl-blur", lang: "ta", width: 1080, height: 1920, custom: { gradient: ["#ff0000", "#0000ff"] } });
  const first = ass.split("\n").filter((l) => l.startsWith("Dialogue: 0,0:00:00.00,"));
  assert.equal(first.length, 10, "one line, 10 strips");
  const clips = first.map((l) => l.match(/\\clip\(0,(-?\d+),1080,(-?\d+)\)/)!.slice(1).map(Number));
  for (let k = 1; k < clips.length; k++) assert.ok(clips[k][0] <= clips[k - 1][1], "strips meet, top to bottom");
  assert.match(first[0], /\\1c&H0000FF&/, "top strip: the top colour (red)"); assert.match(first[9], /\\1c&HFF0000&/, "bottom strip ~ blue");
  const wc = buildAss([{ start: 0, end: 2, ta: "hello", en: "" }], { styleId: "cc-word-cut", lang: "ta", width: 1080, height: 1920, custom: { gradient: ["#ff0000", "#0000ff"] } });
  assert.equal(wc.split("\n").filter((l) => l.startsWith("Dialogue")).length, 10, "Word Cut too");
  const plain = buildAss([{ start: 0, end: 2, ta: "one two", en: "" }], { styleId: "tpl-blur", lang: "ta", width: 1080, height: 1920 });
  assert.ok(!/\\clip/.test(plain), "no gradient: drawn as before");
});

test("cinematic: three lines, an inverted pyramid, the middle one big in capitals, each word coming in as it's said", async () => {
  const { cineRows } = await import("./captionStyles");
  assert.deepEqual(cineRows(9), [[0, 4], [4, 7], [7, 9]], "four, three, two");
  for (let n = 3; n <= 20; n++) {
    const r = cineRows(n), len = r.map(([a, b]) => b - a);
    assert.ok(r.length === 3 && len.every((l) => l >= 1) && len[0] >= len[1] && len[1] >= len[2] && r[2][1] === n, `${n} words: ${len}`);
  }
  assert.deepEqual(cineRows(2), [[0, 1], [1, 2]]); assert.deepEqual(cineRows(1), [[0, 1]]);
  assert.equal(resolveStyle("cc-cinematic").font, "Poppins");
  const words = "this is how we make great videos for every business today".split(" ");
  const ass = buildAss([{ start: 0, end: 4, ta: words.join(" "), en: "" }], { styleId: "cc-cinematic", lang: "ta", width: 1080, height: 1920 });
  const ev = ass.split("\n").filter((l) => l.startsWith("Dialogue"));
  assert.equal(ev.length, words.length, "one event a word");
  assert.equal(new Set(ev.map((l) => l.match(/\\pos\(\d+,(\d+)\)/)![1])).size, 3, "on three lines");
  const mid = ev.filter((l) => /\\fnPoppins ExtraBold\\b1/.test(l)).map((l) => l.replace(/^.*\}/, ""));
  assert.deepEqual(mid, ["GREAT", "VIDEOS", "FOR", "EVERY"], "the middle line big, bold, in capitals");
  const starts = ev.map((l) => l.split(",")[1]);
  assert.equal(new Set(starts).size, words.length, "each word at its own time");
  assert.ok(ev.every((l) => /\\blur[\d.]+\\t\(0,420,\\blur0/.test(l)), "settling out of a blur");
});

test("Cinematic: line spacing moves its three lines apart (editor slider shown)", () => {
  assert.ok(takesLineSpacing(resolveStyle("cc-cinematic")));
  const ys = (g: number) => [...new Set([...buildAss([{ start: 0, end: 4, ta: "this is how we make great videos for you", en: "" }], { styleId: "cc-cinematic", lang: "ta", width: 1080, height: 1920, custom: { lineHeight: g } })
    .matchAll(/\\pos\(\d+,(\d+)\)/g)].map((m) => +m[1]))].sort((a, b) => a - b);
  const gap = (g: number) => { const y = ys(g); return y[y.length - 1] - y[0]; };
  assert.equal(ys(1.6).length, 3);
  assert.ok(gap(1.6) > gap(1) * 1.4 && gap(0.8) < gap(1), `${gap(0.8)} ${gap(1)} ${gap(1.6)}`);
});
