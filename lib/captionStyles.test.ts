import { test } from "node:test";
import assert from "node:assert/strict";
import { cineRows, cornerRows, hookChunks, hookFit, revealUnits, typoSize } from "./captionStyles";
import { assColor, buildAss, CAPTION_FONTS, CAPTION_STYLES, DEFAULT_STYLE, STYLE_CHOICES, STYLE_GROUPS, keywordIndex, resolveStyle, SAFE_ZONES, sanitizeCustom, stackBig, stackChunks, styleOf, tamilRuns, wordTimes, takesLineSpacing } from "./captionStyles";

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

test("styles on offer: the chosen 20, the template pack's 16 and the CINECUT project's 5 + Pro, with the default among them", () => {
  assert.equal(STYLE_CHOICES.length, 36);
  assert.equal(STYLE_CHOICES.filter((s) => s.group === "Templates").length, 5);
  assert.equal(STYLE_CHOICES.filter((s) => s.group === "Typography").length, 10);
  assert.ok(!STYLE_CHOICES.some((s) => s.id === "cc-bold-flicker" || s.id === "cc-corners"), "Bold Flicker and Corner Block no longer offered");
  for (const id of ["tpl-bounce", "tpl-bouncy-fadeout", "tpl-fade-up", "tpl-flicker", "tpl-ramp-up", "tpl-snapping", "tpl-strong-flicker", "tpl-reels-rgb", "tpl-hook-yellow", "tpl-hook-cyan", "tpl-hook-neon"])
    assert.ok(!STYLE_CHOICES.some((s) => s.id === id) && styleOf(id).id === id, `${id}: no longer offered (projects on it keep it)`);
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
  assert.ok(rise.every((l) => /\\move\((\d+),\d+,\1,\d+,0,270\)/.test(l)), "each rises into place");
  // Rise Up: a big Bebas Neue middle line in capitals between two light lowercase ones set to its left and right
  // edges, all amber with a wine glow
  assert.deepEqual(rise.map((l) => l.match(/\\an(\d)/)![1]), ["4", "5", "6"]);
  assert.ok(rise.every((l) => /\\1c&H3EB2F4&/.test(l) && /\\3c&H1F017F&/.test(l)), "amber, wine glow");
  assert.ok(/\\fnAnton\\fscx\d+/.test(rise[1]) && /UP/.test(rise[1].replace(/\{[^}]*\}/g, "")), "the middle line big, in capitals");
  assert.equal(resolveStyle("cc-rise").font, "Poppins Medium");
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
    const at = st.startSize ?? 1; // (a style can start smaller or bigger: its Size shows it)
    assert.ok(Math.abs(looks(r) / standard - at) < 0.02, `${st.id} looks ${(looks(r) / standard * 100).toFixed(0)}% of standard`);
    assert.equal(r.scale, at);
    const anton = resolveStyle(st.id, { font: "Anton", case: "upper" });
    assert.ok(Math.abs(looks(anton) / standard - at) < 0.02, `${st.id} in Anton caps`);
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
  // styles that set their own lines (hooks, stacks, reveals, Rise Up) space them too, each line placed itself
  for (const id of ["tpl-hook-yellow", "trending-1", "cc-bold-flicker", "cc-rise"]) {
    const ys = (lh: number) => [...new Set([...buildAss([cue], { styleId: id, lang: "ta", width: 1080, height: 1920, custom: { lineHeight: lh } })
      .matchAll(/\\pos\(\d+,(\d+)\)|\\move\(\d+,\d+,\d+,(\d+)/g)].map((m) => +(m[1] ?? m[2])))].sort((a, b) => a - b);
    const span = (lh: number) => { const y = ys(lh); return y[y.length - 1] - y[0]; };
    assert.ok(span(2) > span(1.01) * 1.6, `${id}: lines further apart (${span(1.01)} → ${span(2)})`);
  }
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
  const ass = buildAss([{ start: 0, end: 2, ta: "one two", en: "" }], { styleId: "tpl-bounce", lang: "ta", width: 1080, height: 1920, custom: { gradient: ["#ff0000", "#0000ff"] } });
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
  assert.equal(resolveStyle("cc-cinematic").font, "Comfortaa Bold"); // the outer lines; the middle one Poppins ExtraBold
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

test("Text alignment: every style anchors left / right (safe zone edge, or the dragged column's)", () => {
  const ass = (id: string, custom: object) => buildAss([{ start: 0, end: 4, ta: "this is how we make great videos for every business", en: "" }], { styleId: id, lang: "ta", width: 1080, height: 1920, custom });
  for (const st of CAPTION_STYLES) {
    const l = ass(st.id, { textAlign: "left" }), r = ass(st.id, { textAlign: "right" });
    assert.notEqual(l, r, st.name);
    // the style line, or the events' own \an, is left / right anchored
    assert.ok(/Style: Main,[^\n]*,1,\d+,\d+,\d+,1\n/.test(l) || /\\an[147]/.test(l), `${st.name} left`);
    assert.ok(/Style: Main,[^\n]*,3,\d+,\d+,\d+,1\n/.test(r) || /\\an[369]/.test(r), `${st.name} right`);
  }
  // dragged: lines flush to the side of a column centred on the point
  const d = ass("cc-cinematic", { textAlign: "left", x: 0.5, y: 0.5 });
  assert.ok(sanitizeCustom({ textAlign: "left" }).textAlign === "left" && sanitizeCustom({ textAlign: "up" }).textAlign === undefined);
  assert.ok(Math.min(...[...d.matchAll(/\\pos\((\d+),/g)].map((m) => +m[1])) < 540);
});

test("Every caption font is bundled, declared for the editor and measured for the MP4", async () => {
  const fs = await import("node:fs");
  const { WIDTHS, LINE, HEIGHTS } = await import("./fontWidths");
  const css = fs.readFileSync("app/caption-styles.css", "utf8");
  for (const f of CAPTION_FONTS) {
    const m = css.match(new RegExp(`font-family: "${f}"; src: url\\("/caption-fonts/([^"]+)"\\)`));
    assert.ok(m && fs.existsSync(`public/caption-fonts/${m[1]}`), `${f}: file`);
    if (f === "Roboto Black" || f === "Satisfy" || f === "Inter Italic" || f === "Playfair Display Italic") continue; // measured as their family
    assert.equal(WIDTHS[f]?.length, 95, `${f}: widths`);
    assert.ok(LINE[f] && HEIGHTS[f], `${f}: line height, letter heights`);
  }
});

test("Lines the user typed (Enter while editing) win: Cinematic's rows follow them, each word in its row's look", async () => {
  const { typedBreaks, breakLines } = await import("./subtitles");
  const { setWord } = await import("./cueEdit");
  assert.equal(typedBreaks("one two three"), null);
  assert.deepEqual([...typedBreaks(" one two\nthree four \n five\n")!], [1, 3]);
  assert.equal(breakLines("one two\nthree four five", 3), "one two\nthree four five");
  assert.deepEqual(cineRows(6, new Set([1, 2])), [[0, 2], [2, 3], [3, 6]]);
  // "videos" moved off the big middle line: lowercase, in the outer lines' font
  const ass = buildAss([{ start: 0, end: 4, ta: "this is how we\nmake great\nvideos for you", en: "" }], { styleId: "cc-cinematic", lang: "ta", width: 1080, height: 1920 });
  const words = [...ass.matchAll(/^Dialogue:[^\n]*\\pos\(\d+,(\d+)\)[^\n]*\}([^{}\n]+)$/gm)].map((m) => [m[2], +m[1]] as const);
  const y = (w: string) => words.find(([t]) => t === w)![1];
  assert.ok(words.some(([t]) => t === "MAKE") && words.some(([t]) => t === "GREAT") && words.some(([t]) => t === "videos"));
  assert.equal(y("videos"), y("you"));
  assert.ok(y("we") < y("MAKE") && y("MAKE") < y("videos"));
  // editing one word keeps the typed lines
  const c = { start: 0, end: 3, ta: "this is\nhow we", en: "" };
  assert.equal(setWord(c, "ta", 1, { text: "was" }).ta, "this was\nhow we");
});

test("Editing starts from the lines shown; Enter pushes the words after the cursor down a line", async () => {
  const { shownLines, pushDown } = await import("./captionStyles");
  const shown = shownLines("cc-cinematic", {}, "website? 70% of customers check online before");
  assert.equal(shown.split("\n").length, 3);
  assert.equal(shownLines("cc-cinematic", {}, "a b\nc d"), "a b\nc d", "typed lines stay");
  // Enter before "70%": it (and what follows on its line) joins the start of the next line
  const t = "website? 70% of\ncustomers check\nonline before";
  assert.deepEqual(pushDown(t, t.indexOf("70%")), { text: "website?\n70% of customers check\nonline before", at: 9 });
  // on the last line: a new line
  assert.equal(pushDown(t, t.indexOf("before")).text, "website? 70% of\ncustomers check\nonline\nbefore");
});

test("Pro: Titan One a word at a time, the video negative inside the letters (the MP4 blends through a white mask)", async () => {
  const { maskAss } = await import("./captionStyles");
  const pro = resolveStyle("cc-pro");
  assert.equal(pro.font, "Titan One"); assert.equal(pro.effect, "oneword"); assert.equal(pro.blend, "difference");
  assert.equal(resolveStyle("cc-pro", { blend: null }).blend, undefined, "Normal turns it off");
  assert.equal(resolveStyle("tall-caps", { blend: "screen" }).blend, "screen", "any style can blend");
  const ass = buildAss([{ start: 0, end: 2, ta: "make great videos", en: "" }], { styleId: "flip-card", lang: "ta", width: 1080, height: 1920 });
  const m = maskAss(ass);
  assert.ok(!/\\[1-4]?c&H(?!FFFFFF&)[0-9A-F]{6}&/i.test(m), "every colour white");
  assert.ok(!/\\bord[1-9]/.test(m) && /^Style: Main,([^,]*,){14}1,0,0,/m.test(m), "no outline, shadow or box");
});

test("A word picked on the video: its own font, size, bold, italic in the MP4, kept with it through edits", async () => {
  const { setWord, setText } = await import("./cueEdit");
  const { lineScale } = await import("./fontWidths");
  let c = { start: 0, end: 3, ta: "make great videos", en: "" } as Parameters<typeof setWord>[0];
  c = setWord(c, "ta", 1, { look: { font: "Lobster", size: 1.5, bold: true } });
  c = setWord(c, "ta", 1, { look: { italic: true } });
  assert.deepEqual(c.wf, [null, { font: "Lobster", size: 1.5, bold: true, italic: true }, null]);
  assert.deepEqual(setText(c, "ta", "we make great videos").wf, [null, null, { font: "Lobster", size: 1.5, bold: true, italic: true }, null], "stays with its word");
  const ass = buildAss([c], { styleId: "tall-caps", lang: "ta", width: 1080, height: 1920 });
  const em = Math.round(1080 * 0.075 * resolveStyle("tall-caps").size! * 10) / 10;
  assert.match(ass, new RegExp(`\\\\fnLobster\\\\b1\\\\i1\\}\\{\\\\fs${Math.round(em * lineScale("Lobster") * 1.5 * 10) / 10}\\}GREAT`), "Lobster at 150%, bold, italic");
  assert.ok(!ass.includes("\\fsz"), "our size tag never reaches libass");
  assert.equal(setWord(c, "ta", 1, { look: null }).wf, undefined, "reset");
  // unknown fonts never reach the file
  const bad = buildAss([{ ...c, wf: [{ font: "X}{\\pos(0,0)" }, null, null] }], { styleId: "tall-caps", lang: "ta", width: 1080, height: 1920 });
  assert.ok(!bad.includes("X}"));
});

test("Words picked on the video keep their look in the layouts that set their own lines (stacks, hooks, Center Stage)", () => {
  const ids = CAPTION_STYLES.filter((s) => ["stack", "hook", "solo"].includes(s.effect ?? "")).map((s) => s.id);
  assert.ok(ids.length >= 4);
  for (const id of ids) {
    const words = "make great videos for every business owner".split(" ");
    const cue = { start: 0, end: 4, ta: words.join(" "), en: "", wf: words.map(() => ({ font: "Lobster", italic: true })) };
    const ass = buildAss([cue], { styleId: id, lang: "ta", width: 1080, height: 1920 });
    assert.ok(/\\fnLobster/.test(ass) && /\\i1/.test(ass), `${id}: the word's own font and slant`);
  }
});

test("Rise Up's glow is its Shadow: the colour, the size, or off", () => {
  const ass = (custom: object) => buildAss([{ start: 0, end: 3, ta: "my name is sherwyn joyl from cbe", en: "" }], { styleId: "cc-rise", lang: "ta", width: 1080, height: 1920, custom })
    .split("\n").filter((l) => l.startsWith("Dialogue"));
  assert.ok(ass({}).every((l) => /\\3c&H1F017F&/.test(l)), "wine by default");
  assert.ok(ass({ shadowColor: "#0000FF" }).every((l) => /\\3c&HFF0000&/.test(l) && /\\4c&HFF0000&/.test(l)), "blue when picked");
  const blur = (l: string) => +l.match(/\\blur([\d.]+)/)![1];
  assert.ok(blur(ass({ shadowSize: 0.1 })[0]) > blur(ass({})[0]) * 2, "bigger size, bigger glow");
  assert.ok(ass({ shadow: false }).every((l) => !/\\blur/.test(l) && !/\\4c/.test(l)), "off");
});

test("styles start at their own line spacing: Typo Block 70%, Rise Up 80% (the slider still changes it)", () => {
  assert.equal(resolveStyle("cc-typo-block").lineHeight, 0.7);
  assert.equal(resolveStyle("cc-rise").lineHeight, 0.8);
  assert.equal(resolveStyle("cc-cinematic").lineHeight, 0.7);
  assert.equal(resolveStyle("cc-rise", { lineHeight: 1.4 }).lineHeight, 1.4);
  assert.equal(resolveStyle("tall-caps").lineHeight, undefined);
});

test("Typo Block: three lines at most, however long the caption (typed lines win)", async () => {
  const { typoBreaks } = await import("./captionStyles");
  for (let n = 1; n <= 24; n++) assert.ok(typoBreaks(n).size <= 2, `${n} words`);
  assert.deepEqual([...typoBreaks(4, new Set([0, 1, 2]))], [0, 1, 2], "typed lines kept");
  const words = "do you wonder why every business needs a website today my friend".split(" ");
  const ass = buildAss([{ start: 0, end: 4, ta: words.join(" "), en: "" }], { styleId: "cc-typo-block", lang: "ta", width: 1080, height: 1920 });
  const ys = new Set([...ass.matchAll(/\\move\(\d+,\d+,\d+,(\d+)/g)].map((m) => m[1]));
  assert.ok(ys.size <= 3, `${ys.size} lines`);
});

test("Letter Rise: its letters flow in one wave from when the caption appears; 80% line spacing", () => {
  const s = resolveStyle("cc-letter-rise");
  assert.ok(s.flow && s.lineHeight === 0.8);
  const words = [{ w: "website", s: 2, e: 2.6 }, { w: "70%", s: 2.6, e: 3 }, { w: "customers", s: 3, e: 4 }];
  const u = revealUnits(words, true, [2, 4.3]);
  assert.equal(u[0].s, 2, "the first letter as the caption appears");
  assert.ok(u.every((x, i) => !i || x.s > u[i - 1].s), "one after another");
  assert.ok(u[u.length - 1].s < 2 + 2.3 * 0.6 + 1e-9, "the last letter well before the caption ends");
  assert.ok(u.find((x) => x.j === 2)!.s < 3, "a later word starts before it's said");
});

test("Letter Rise: three lines (before the keyword, the keyword, after it), however long the caption", async () => {
  const { keywordRows } = await import("./captionStyles");
  const w = (t: string) => t.split(" ");
  assert.deepEqual([...keywordRows(w("do you wonder why every Business needs a website today"), 5)].sort(), [4, 5]);
  assert.equal(keywordRows(w("Business needs a website today my friend"), 0).size, 2, "keyword first: the rest on two lines");
  assert.equal(keywordRows(w("do you wonder about Business"), 4).size, 2, "keyword last: the rest on two lines");
  for (const t of ["do you wonder why every business needs a website today my friend", "EveryCut makes it simple", "website? 70% of customers check online before buying anything today"]) {
    const ass = buildAss([{ start: 0, end: 4, ta: t, en: "" }], { styleId: "cc-letter-rise", lang: "ta", width: 1080, height: 1920 });
    const ys = new Set([...ass.matchAll(/\\move\(\d+,\d+,\d+,(\d+)/g)].map((m) => m[1]));
    assert.ok(ys.size <= 3, `${t}: ${ys.size} lines`);
  }
});

test("Setup & Punch Pro: left-aligned, only the punch words blended (two parts in the MP4)", () => {
  const s = resolveStyle("setup-punch-pro");
  assert.equal(s.textAlign, "left");
  assert.equal(s.blend, "difference");
  const cue = { start: 0, end: 3, ta: "this is the big punch", en: "" } as unknown as Parameters<typeof buildAss>[0][number];
  const o = { styleId: "setup-punch-pro", lang: "ta" as const, width: 1080, height: 1920 };
  const last = (part: "plain" | "punch") => buildAss([cue], { ...o, part }).split("\n").filter((l) => l.startsWith("Dialogue")).pop()!;
  // when every word is said: the plain part hides "big punch", the punch part hides the set-up
  assert.match(last("plain"), /\\alpha&HFF&\}big /);
  assert.doesNotMatch(last("plain"), /\\alpha&HFF&\}this /);
  assert.match(last("punch"), /\\alpha&HFF&\}this /);
  assert.doesNotMatch(last("punch"), /\\alpha&HFF&\}punch/);
  // other styles ignore the part
  assert.equal(buildAss([cue], { ...o, styleId: "setup-punch", part: "plain" }), buildAss([cue], { ...o, styleId: "setup-punch" }));
});

test("Rise Up: a short caption still has its big capital line (two lines: the second, one line: it)", () => {
  for (const ta of ["Welcome", "Hello friends", "grow your sales"]) {
    const ass = buildAss([{ start: 0, end: 2, ta, en: "" } as unknown as Parameters<typeof buildAss>[0][number]], { styleId: "cc-rise", lang: "ta", width: 1080, height: 1920 });
    const last = ass.split("\n").filter((l) => l.startsWith("Dialogue") && l.includes("Anton"));
    assert.ok(last.length >= 1, `${ta}: a big Anton line`);
  }
});

test("Rise Up: always three lines from three words up, a short big middle (as the reference)", async () => {
  const { staggerBreaks } = await import("./captionStyles");
  const rows = (n: number) => { const b = [...staggerBreaks(n)].sort((x, y) => x - y), out: number[] = []; let a = 0; for (const j of [...b, n - 1]) { out.push(j + 1 - a); a = j + 1; } return out; };
  assert.deepEqual(rows(7), [3, 2, 2], "my name is / SHEWYN JOYL / from cbe");
  assert.deepEqual(rows(3), [1, 1, 1]);
  assert.deepEqual(rows(4), [2, 1, 1]);
  assert.deepEqual(rows(2), [1, 1]);
  for (let n = 3; n <= 14; n++) assert.equal(rows(n).length, 3, `${n} words`);
});

test("Rise Up: lines set to the big line's edges only when it's the widest, else all centred", async () => {
  const { staggerFlush } = await import("./captionStyles");
  const s = resolveStyle("cc-rise");
  assert.equal(staggerFlush(["choose sherwin", "joel", "the artech"], s), false, "a short big line: centred");
  assert.equal(staggerFlush(["my name is", "shewyn joyl", "from cbe"], s), true, "a wide big line: to its edges");
});

test("Blur Animation: Montserrat around an Inter Italic middle line, each word pops up out of a blur as it's said (only its height grows)", () => {
  const s = resolveStyle("tpl-blur");
  assert.equal(s.font, "Montserrat SemiBold");
  assert.equal(s.midFont, "Inter Italic");
  assert.equal(s.color, "#FFFFFF");
  assert.equal(s.scale, 0.8, "starts at 80%");
  assert.equal(s.anim, "wordpop");
  const ass = buildAss([{ start: 0, end: 2, ta: "grow your sales", en: "" } as unknown as Parameters<typeof buildAss>[0][number]], { styleId: "tpl-blur", lang: "ta", width: 1080, height: 1920 });
  const first = ass.split("\n").find((l) => l.startsWith("Dialogue"))!;
  assert.match(first, /\\fscy40\\t\(0,80,\\alpha&H00&\)/, "the word said pops up");
  assert.doesNotMatch(first, /\\fscx/, "never wider (the line would move)");
  assert.match(first, /\\alpha&HFF&\}sales/, "the words to come hidden");
});

test("Blur Animation: Tamil in the italic middle line is slanted (Inter Italic has no Tamil)", () => {
  const ass = buildAss([{ start: 0, end: 3, ta: "நீங்கள் ஏன் ஒவ்வொரு வணிகமும் ஒரு இணையதளம் வேண்டும்", en: "" } as unknown as Parameters<typeof buildAss>[0][number]], { styleId: "tpl-blur", lang: "ta", width: 1080, height: 1920 });
  const last = ass.split("\n").filter((l) => l.startsWith("Dialogue")).pop()!;
  assert.match(last, /\\fnInter Italic\\fax-0\.21\}[^N]*?வணிகமும்/, "the middle line's Tamil slanted");
  assert.doesNotMatch(last.split("\\N")[0], /\\fax/, "the first line upright");
  const en = buildAss([{ start: 0, end: 3, ta: "Do you wonder why every business needs a", en: "" } as unknown as Parameters<typeof buildAss>[0][number]], { styleId: "tpl-blur", lang: "ta", width: 1080, height: 1920 });
  assert.doesNotMatch(en, /\\fax/, "English uses the real italic");
});

test("Riseup Ultra: white Bodoni italic lines, only the big Anton middle line blended (two parts in the MP4)", () => {
  const s = resolveStyle("cc-rise-ultra");
  assert.equal(s.font, "Bodoni Moda Italic");
  assert.equal(s.blend, "difference");
  const cue = { start: 0, end: 3, ta: "my name is Shewyn Joyl from cbe", en: "" } as unknown as Parameters<typeof buildAss>[0][number];
  const o = { styleId: "cc-rise-ultra", lang: "ta" as const, width: 1080, height: 1920 };
  const ev = (part: "plain" | "punch") => buildAss([cue], { ...o, part }).split("\n").filter((l) => l.startsWith("Dialogue"));
  assert.ok(ev("plain").length > 0 && ev("plain").every((l) => !/\\fnAnton/.test(l)), "plain: the outer lines only");
  assert.ok(ev("punch").length > 0 && ev("punch").every((l) => /\\fnAnton/.test(l)), "mask: the middle line only");
});

test("Spark Slide: three lines flush left, the first slides in, the later words slide up one by one, the star slides up and spins", async () => {
  const { starPoints, STAR_SLIDE, starSpin } = await import("./captionStyles");
  const s = resolveStyle("cc-spark");
  assert.equal(s.spark?.star, "#D97757");
  assert.equal(resolveStyle("cc-spark", { accent: "#00FF00" }).spark?.star, "#00FF00", "the star's colour is editable");
  const pts = starPoints();
  assert.ok(pts.length > 100 && pts.every(([x, y]) => Math.hypot(x, y) <= 1.001), "the traced star, radius 1");
  const ass = buildAss([{ start: 0, end: 3, ta: "my name is Shewyn Joyl from cbe iam 23 years", en: "" } as unknown as Parameters<typeof buildAss>[0][number]], { styleId: "cc-spark", lang: "ta", width: 1080, height: 1920 });
  const ev = ass.split("\n").filter((l) => l.startsWith("Dialogue"));
  const text = ev.filter((l) => /\\an4/.test(l));
  assert.equal(text.length, 1 + 6, "the first line (4 words), then each of the later lines' 6 words");
  const [, from, to] = text[0].match(/\\an4\\move\((-?\d+),\d+,(\d+),\d+,0,380\)/)!.map(Number);
  assert.ok(from < to, "the first slides in from the left");
  assert.match(text[1], /\\fnAnton/, "the big middle line in Anton");
  assert.match(text.at(-1)!, /\\fnPoppins Light Italic/, "the last in the light italic");
  for (const l of text.slice(1)) {
    const [, x0, y0, x1, y1] = l.match(/\\move\((\d+),(\d+),(\d+),(\d+),0,300\)/)!.map(Number);
    assert.ok(x0 === x1 && y0 > y1, "a later word slides up");
    assert.equal((l.match(/\\alpha&HFF&/g) ?? []).length, (l.match(/\{\\r/g) ?? []).length - 1, "only that word showing");
  }
  const leftOf = (l: string) => +l.match(/\\move\(-?\d+,\d+,(\d+)/)![1];
  assert.equal(new Set(text.map(leftOf)).size, 1, "all flush left");
  const star = ev.filter((l) => /\\p1/.test(l));
  assert.equal(star.length, 1);
  const [, t0, t1, deg] = star[0].match(/\\t\((\d+),(\d+),\\frz-([\d.]+)\)/)!.map(Number);
  assert.equal(t0, STAR_SLIDE[0], "spins once it's in place");
  assert.equal(t1, 3000, "spinning till the caption ends");
  assert.ok(deg > 0 && deg / ((t1 - t0) / 1000) <= 60, "slowly");
  assert.equal(starSpin(3000).deg, deg);
  const [, , sy0, , sy1] = star[0].match(/\\move\((\d+),(\d+),(\d+),(\d+)/)!.map(Number);
  assert.ok(sy0 > sy1, "from below");
  assert.ok(star.every((l) => l.startsWith("Dialogue: 0,")), "the star under the text");
});

test("Box Punch: the set-up's words appear as said, the box wipes in left to right, then the punch rises into it fading in", async () => {
  const { BOX_WIPE, BOX_RISE, boxPunchRows } = await import("./captionStyles");
  assert.equal(resolveStyle("cc-box-punch", { accent: "#123456" }).boxPunch?.color, "#123456", "the box colour is editable");
  assert.equal(resolveStyle("cc-box-punch").scale, 0.8, "starts at 80%");
  const ass = buildAss([{ start: 0, end: 3, ta: "my name is shewyn joyl", en: "" } as unknown as Parameters<typeof buildAss>[0][number]], { styleId: "cc-box-punch", lang: "ta", width: 1080, height: 1920 });
  const ev = ass.split("\n").filter((l) => l.startsWith("Dialogue"));
  const setup = ev.filter((l) => /Poppins Light/.test(l));
  assert.equal(setup.length, 3, "each set-up word from when it's said");
  const box = ev.find((l) => /\\p1/.test(l))!;
  const [, x0, , x1] = box.match(/\\clip\((\d+),(\d+),(\d+),(\d+)\)\\t\(0,(\d+)/)!.map(Number);
  assert.equal(x0, x1, "the box starts with no width");
  assert.match(box, new RegExp(`\\\\t\\(0,${BOX_WIPE},\\\\clip`), "and wipes open");
  const punch = ev.find((l) => /\\fnCaveat Bold/.test(l))!;
  const [, , ya, , yb] = punch.match(/\\move\((\d+),(\d+),(\d+),(\d+),0,(\d+)\)/)!.map(Number);
  assert.ok(ya > yb, "the punch rises");
  assert.match(punch, new RegExp(`\\\\alpha&HFF&\\\\t\\(0,${BOX_RISE},\\\\alpha&H00&\\)`), "fading in");
  assert.match(punch, /\\clip\(/, "cut off at the box");
  const t = (l: string) => l.split(",")[1];
  assert.ok(t(punch) > t(box), "after the box");
  // a long set-up goes on two lines rather than shrinking
  const s = resolveStyle("cc-box-punch");
  assert.equal(boxPunchRows("my".split(" "), s).length, 1);
  assert.equal(boxPunchRows("hello everyone my name is and i come from the city of coimbatore".split(" "), s).length, 2);
});

test("Bold Bar: small words spread over a big word on a bar (punching up), the big word wipes in, the last rises", async () => {
  const { boldBar, BAR_TIME } = await import("./captionStyles");
  const s = resolveStyle("cc-bold-bar");
  const L = boldBar("avandhan irukradhulaye periya Dangerous person".split(" "), s);
  assert.deepEqual([L.topRows.map((r) => r.idx), L.big, L.last], [[[0, 1, 2]], 3, [4]]);
  assert.deepEqual(boldBar(["Hi"], s).topRows, [], "one word: just the big one");
  // the big word is a real word, never a lone letter or a little one
  const W = "he is a very good person".split(" ");
  const B = boldBar(W, s);
  assert.equal(W[B.big], "good");
  assert.equal("this is A person".split(" ")[boldBar("this is A person".split(" "), s).big], "this", "not \"A\" nor \"is\"");
  assert.deepEqual(boldBar("this is A person".split(" "), s).last, [1, 2, 3], "the words after it on the last line");
  // the first line is always one line; a caption's usual length keeps it at its size (more words go under the big one)
  for (const t of ["Do you wonder why every business needs a website", "So if you're serious about your business", "people always come to me and ask how did you become a good person"]) {
    const W = t.split(" "), L2 = boldBar(W, s);
    assert.equal(L2.topRows.length, 1, `${t}: one top line`);
    assert.deepEqual([...L2.topRows[0].idx, L2.big, ...L2.last], W.map((_, i) => i), "every word, in order");
    assert.ok(L2.lastLines.length <= 2);
  }
  assert.equal(boldBar("Do you wonder why every business needs a website".split(" "), s).topSize, s.boldBar!.top, "at its size");
  const ass = buildAss([{ start: 0, end: 3, ta: "avandhan irukradhulaye periya Dangerous person", en: "" } as unknown as Parameters<typeof buildAss>[0][number]], { styleId: "cc-bold-bar", lang: "ta", width: 1080, height: 1920 });
  const ev = ass.split("\n").filter((l) => l.startsWith("Dialogue"));
  const tops = ev.filter((l) => /Poppins Light Italic/.test(l));
  assert.equal(tops.length, 3);
  assert.ok(tops.every((l) => /\\fscx30\\fscy30\\t\(0,\d+,\\fscx115\\fscy115\)/.test(l)), "each small word punches up");
  const xs = tops.map((l) => +l.match(/\\pos\((\d+)/)![1]);
  assert.ok(xs[0] < xs[1] && xs[1] < xs[2], "spread left, centre, right");
  const big = ev.find((l) => /Dangerous/.test(l))!;
  assert.match(big, new RegExp(`\\\\clip\\((\\d+),(-?\\d+),\\1,(-?\\d+)\\)\\\\t\\(0,${BAR_TIME.wipe},\\\\clip`), "the big word wipes in");
  assert.equal(ev.filter((l) => /\\p1/.test(l)).length, 24, "its bar, a gradient in slices, wiping with it");
  const last = ev.find((l) => /\\fnSatisfy/.test(l))!;
  const [, , y0, , y1] = last.match(/\\move\((\d+),(\d+),(\d+),(\d+)/)!.map(Number);
  assert.ok(y0 > y1, "the last word rises");
  assert.equal(resolveStyle("cc-bold-bar", { accent: "#00AAFF" }).boldBar?.colors[0], "#00AAFF", "the bar colour is editable");
});
