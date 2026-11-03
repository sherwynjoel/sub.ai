"use client";
import { BLENDS, byLetters, staggerBreaks, staggerFlush, POP_MS, SPARK_SLIDE, SPARK_FIT, STAR_AT, STAR_SLIDE, starSpin, boxPunchCut, boxPunchRows, boldBar, BAR_AT, BAR_TIME, cardSlide, CARD_AT, CARD_TIME, easeInOut, boxStart, BOX_WIPE, BOX_RISE, BOX_PAD, SPARK_WORD_UP, starPoints, needsSlant, SLANT, CAPTION_FONTS, GLOW, caseOf, CINE_BIG, CINE_OVER, cineBig, cineFont, cineRows, GRADIENT_STOPS, highlights, lineBox, lineCount, linesOf, spacesLines, takesLineSpacing, nameOrKeyword, wordGroups, cornerRows, FLICKER, FLICKER2, flickerOn, HOOK_STEP, hookChunks, keywordIndex, resolveStyle, RISE, RISE_DY, revealUnits, stackBig, stackChunks, keywordRows, typoBreaks, typoSize, wordTimes, type CaptionCustom } from "@/lib/captionStyles";
import { cssBaseline, lineScale, textWidth } from "@/lib/fontWidths";
import { breakLines, lineBreaks, typedBreaks } from "@/lib/subtitles";
import type { WordLook } from "@/db/schema";

type Props = {
  styleId: string; custom?: CaptionCustom; text: string; sub?: string; start: number; end: number; time: number;
  starts?: number[];             // when each word starts (measured or edited), else shared by length
  colors?: (string | null)[];    // a colour per word the user picked
  looks?: (WordLook | null)[];   // a font / size / bold / italic per word the user picked out
  pickedWord?: number;           // the word picked on the video (outlined)
  ratio?: number;                // the frame's width ÷ height: with line spacing, lines break where the MP4's do
  part?: "plain" | "punch";      // a punch-only blend (Setup & Punch Pro): all but the punch words, or only them
};

const hide: React.CSSProperties = { visibility: "hidden" };
/** The spark star's outline as an SVG path (radius 1 around 0, 0). */
const STAR_PATH = "M" + starPoints().map(([x, y]) => `${x},${y}`).join("L") + "Z";

/** A font for the Latin letters, then the Tamil font for Tamil letters (the Latin caption fonts have none). */
const stack = (font: string, tamil?: string) => `"${font}", ${tamil ? `"${tamil}", ` : ""}"Noto Emoji", var(--font-tamil), "Nirmala UI", "Noto Sans", sans-serif`; // one-colour emoji, as in the MP4

/**
 * A caption line drawn in a caption style at a moment in time. Mirrors buildAss() in lib/captionStyles.ts
 * so the editor preview matches the burned-in MP4. Sized in container units: the parent needs container-type: size.
 */
export default function StyledCaption({ styleId, custom, text, sub, start, end, time, starts, colors: picked, looks, pickedWord, ratio, part }: Props) {
  const s = resolveStyle(styleId, custom);
  const colors = highlights(s) ? picked : undefined; // Word Cut: no words picked out
  // Gradient text: the letters filled top colour → bottom colour on each line (a word with its own colour keeps it).
  const grad = s.gradient ?? null;
  const words = wordTimes(caseOf(s, text), start, end, starts);
  const kw = s.keyword?.line ? nameOrKeyword(wordTimes(text, start, end).map((w) => w.w)) : keywordIndex(words.map((w) => w.w));
  // Lines as tall as libass draws them (its font's own line height), × the line spacing in the plain layout; with
  // spacing set, broken at the same words as the MP4 (lineCount), which places each line itself.
  const g = takesLineSpacing(s) ? s.lineHeight ?? 1 : 1, lh = lineBox(s, text) * g;
  const brk = typedBreaks(text) ?? (s.stagger || s.spark ? staggerBreaks(words.length) : null) ?? lineBreaks(words.map((w) => w.w), ratio && spacesLines(s) && Math.abs(g - 1) > 0.005 ? lineCount(s, caseOf(s, text), ratio) : linesOf(s));
  // a middle line in its own font (Blur Animation's Inter Italic), when there are three (as the MP4)
  const rowAt = [0, ...[...brk].sort((a, b) => a - b).map((b) => b + 1)], midRow = s.midFont && rowAt.length === 3 ? rowAt.slice(1) : null;
  let i = words.findIndex((w) => time < w.e);
  if (i < 0) i = words.length - 1;
  const p = Math.min(1, Math.max(0, (time - start) / Math.max(0.01, end - start)));

  const pad = s.boxPad ?? 0.28;
  const base: React.CSSProperties = {
    whiteSpace: s.lines === 1 ? "nowrap" : "pre-line", fontFamily: stack(s.font, s.fontTa), fontSize: `calc(${s.size ?? 1} * 7.5cqmin)`, fontWeight: s.bold ? 700 : 400, fontStyle: s.italic ? "italic" : undefined,
    color: s.color,
    textShadow: [s.glow && !s.box ? `0 0 .12em ${s.glow}, 0 0 .35em ${s.glow}b0` : "", s.shadow ? `0 ${s.shadow}em ${s.shadow * 2}em ${s.shadowColor ? s.shadowColor + "99" : "rgba(0,0,0,.6)"}` : ""].filter(Boolean).join(", ") || undefined,
    WebkitTextStroke: s.outline ? `${s.outline[1] * 2}em ${s.outline[0]}` : undefined,
    background: s.box, padding: s.box ? `${pad * 0.65}em ${pad * 1.6}em` : undefined, borderRadius: s.box ? ".25em" : undefined,
    letterSpacing: s.spacing ? `${s.spacing}em` : undefined,
    lineHeight: lh,
  };
  const gradBase: React.CSSProperties = grad ? {
    ...base, textShadow: undefined,
    filter: [s.glow && !s.box ? `drop-shadow(0 0 .08em ${s.glow}) drop-shadow(0 0 .22em ${s.glow}b0)` : "", s.shadow ? `drop-shadow(0 ${s.shadow}em ${s.shadow}em ${s.shadowColor ? s.shadowColor + "99" : "rgba(0,0,0,.6)"})` : ""].filter(Boolean).join(" ") || undefined,
  } : base;
  // Entrance, from the playhead (so scrubbing shows what the MP4 will): 0.25 s or less on short captions.
  const k = Math.min(1, Math.max(0, (time - start) / Math.max(0.05, Math.min(0.25, (end - start) * 0.4))));
  const ease = 1 - Math.pow(1 - k, 3);
  const enter: React.CSSProperties = {};
  if (s.anim === "fade") enter.opacity = k;
  else if (s.anim === "pop") enter.transform = `scale(${0.6 + 0.4 * ease})`;
  else if (s.anim === "zoom") enter.transform = `scale(${ease})`;
  else if (s.anim === "bounce") enter.transform = `scale(${k < 0.6 ? 0.4 + (1.18 - 0.4) * (k / 0.6) : 1.18 - 0.18 * ((k - 0.6) / 0.4)})`;
  else if (s.anim === "slide") { enter.transform = `translateY(${(1 - ease) * 0.6}em)`; enter.opacity = Math.min(1, k / 0.6); }
  const ms = (time - start) * 1000, t = Math.min(250, (end - start) * 400);
  if (s.anim === "blur") { const b = Math.min(1, ms / (t * 1.4)); enter.filter = `blur(${((1 - b) * 0.5).toFixed(3)}em)`; enter.opacity = Math.min(1, ms / t); }
  else if (s.anim === "flicker" || s.anim === "flicker2") enter.opacity = flickerOn(s.anim === "flicker2" ? FLICKER2 : FLICKER, ms) ? 1 : 0;
  else if (s.anim === "ramp") { const r = 1 - Math.pow(1 - Math.min(1, ms / t), 2); enter.transform = `scale(${1.18 - 0.18 * r}, ${r})`; enter.opacity = Math.min(1, ms / (t * 0.5)); }
  else if (s.anim === "snap") { enter.transform = `scale(${1.5 - 0.5 * Math.min(1, ms / 90)})`; enter.opacity = Math.min(1, ms / 60); }
  else if (s.anim === "cinematic") { const c = Math.min(1, ms / 420), e2 = 1 - Math.pow(1 - c, 3); enter.filter = `blur(${((1 - c) * 0.25).toFixed(3)}em)`; enter.transform = `scale(${1.12 - 0.12 * e2})`; enter.opacity = Math.min(1, ms / 300); }
  else if (s.anim === "bouncyout") {
    enter.transform = `scale(${k < 0.6 ? 0.4 + (1.18 - 0.4) * (k / 0.6) : 1.18 - 0.18 * ((k - 0.6) / 0.4)})`;
    enter.opacity = Math.min(1, Math.max(0, (end - time) / 0.25)); // fades away at the end
  }
  const whole = s.effect === "cine" ? {} : enter; // Cinematic: its words come in one by one instead
  const wrap: React.CSSProperties = {
    ...whole,
    opacity: Number(whole.opacity ?? 1) * (s.opacity ?? 1),
    transform: [whole.transform, s.rotate ? `rotate(${s.rotate}deg)` : ""].filter(Boolean).join(" ") || undefined,
  };

  // A colour of its own (a word picked out), kept over a gradient.
  const own = (c: string): React.CSSProperties => ({ color: c, WebkitTextFillColor: grad ? c : undefined });

  const flowUnits = s.flow ? revealUnits(words, s.reveal === "letters", [start, end]) : [];
  // A word's own look (picked on the video: as the MP4's wordLookTags).
  const lookOf = (j: number): React.CSSProperties => {
    const lk = looks?.[j], st: React.CSSProperties = {};
    if (lk?.font && (CAPTION_FONTS as readonly string[]).includes(lk.font)) st.fontFamily = stack(lk.font, s.fontTa);
    if (lk?.size && Math.abs(lk.size - 1) > 0.001) st.fontSize = `${Math.min(3, Math.max(0.4, lk.size)) * (s.effect === "typo" ? typoSize(j) : 1)}em`;
    if (lk?.bold !== undefined) st.fontWeight = lk.bold ? 700 : 400;
    if (lk?.italic !== undefined) st.fontStyle = lk.italic ? "italic" : "normal";
    return st;
  };
  // One word in a layout that sets its own lines (stacks, hooks, one word at a time): pickable on the video, in its
  // own colour and look.
  const pick = (j: number, text: string) => (
    <span key={j} data-j={j} className={pickedWord === j ? "w-picked" : undefined} style={{ ...(colors?.[j] ? own(colors[j]!) : {}), ...lookOf(j) }}>{text}</span>
  );

  const word = (j: number) => {
    const state = j < i ? "past" : j === i ? "active" : "future";
    const st: React.CSSProperties = {};
    if (midRow && j >= midRow[0] && j < midRow[1]) st.fontFamily = stack(s.midFont!, s.fontTa);
    if (state === "future") {
      if (s.future === null) st.visibility = "hidden";
      else if (s.future) st.color = s.future;
    }
    if (state === "active") {
      if (s.active) st.color = s.active;
      if (s.mark) Object.assign(st, { background: s.mark, borderRadius: ".14em", padding: "0 .12em", textShadow: "none", WebkitTextStroke: "0" }); // the MP4 turns the edge into the swipe
      if (s.underline) st.textDecoration = "underline";
      if (s.activeGrow) st.transform = "scale(1.15)";
    }
    // (layouts that show each word in its place before it's said, as reveals do, have the keyword's look from the start:
    // else it grew into it when said, a jump)
    if (j === kw && s.keyword && (state !== "future" || s.reveal || s.effect === "typo")) {
      if (s.keyword.color) st.color = s.keyword.color;
      if (s.keyword.font) st.fontFamily = stack(s.keyword.font, s.fontTa);
      if (s.keyword.italic) st.fontStyle = "italic";
      if (s.keyword.grow) st.transform = "scale(1.18)";
      if (s.keyword.scale) st.fontSize = `${s.keyword.scale}em`;
    }
    if (s.effect === "typo") st.fontSize = `${typoSize(j)}em`;
    if (s.effect === "typo" && s.typoBig && typoSize(j) > 1) { // the big words: their font and own gradient (as the MP4)
      const [top, bottom] = s.typoBig.gradient;
      Object.assign(st, { fontFamily: stack(s.typoBig.font, s.fontTa), backgroundImage: `linear-gradient(${top} ${GRADIENT_STOPS[0] * 100}%, ${bottom} ${GRADIENT_STOPS[1] * 100}%)`,
        WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "none",
        filter: s.shadow ? `drop-shadow(0 ${s.shadow}em ${s.shadow}em rgba(0,0,0,.6))` : undefined });
    }
    if (s.anim === "wordin") { // each word blurs in as it's said; the ones to come are hidden
      if (state === "future") st.visibility = "hidden";
      if (state === "active") { const w = Math.min(1, Math.max(0, (time - words[j].s) / 0.16)); st.opacity = w; st.filter = `blur(${((1 - w) * 0.3).toFixed(3)}em)`; }
    }
    if (s.anim === "wordpop") { // each word pops up out of a blur as it's said (as the MP4)
      if (state === "future") st.visibility = "hidden";
      if (state === "active") {
        const ms = Math.max(0, (time - words[j].s) * 1000), sy = 0.4 + 0.6 * Math.sqrt(Math.min(1, ms / POP_MS)); // libass's \t accel 0.5
        Object.assign(st, { opacity: Math.min(1, ms / 80), filter: `blur(${(Math.max(0, 1 - ms / 160) * 0.12).toFixed(3)}em)`,
          transform: `scaleY(${sy.toFixed(3)})`, transformOrigin: "50% 78%", transition: "none" }); // grown off the baseline
      }
    }
    // an italic middle line's Tamil (no italic of its own): slanted (as the MP4)
    if (midRow && j >= midRow[0] && j < midRow[1] && /italic/i.test(s.midFont!) && needsSlant(words[j].w)) st.transform = `${st.transform ?? ""} skewX(-${(Math.atan(SLANT) * 180 / Math.PI).toFixed(1)}deg)`;
    if (s.effect === "wobble") st.transform = `${st.transform ?? ""} rotate(${j % 2 ? -4 : 3}deg)`;
    if (colors?.[j] && state !== "future") st.color = colors[j]!;
    if (grad && st.color) st.WebkitTextFillColor = st.color; // its own colour, over the gradient
    Object.assign(st, lookOf(j));
    if (s.reveal || s.effect === "typo") {
      // Each word (or letter) comes in as it's said, in its final place (as the MP4's layers).
      const reveal = s.reveal ?? "rise";
      const look = (t0: number): React.CSSProperties => {
        const since = time - t0;
        if (since < 0) return { visibility: "hidden" };
        if (reveal === "flicker") return { opacity: flickerOn(FLICKER2, since * 1000) ? 1 : 0 };
        // risen by shifting it in place (inline, as it ends up), so it settles without a jump when the rise ends
        const v = Math.min(1, since / RISE);
        return v >= 1 ? {} : { position: "relative", top: `${((1 - v) * RISE_DY).toFixed(3)}em`, opacity: v };
      };
      // flow: one wave of letters through the caption from when it appears (as the MP4)
      const units = s.flow ? flowUnits.filter((u) => u.j === j) : null;
      if (reveal === "letters" && byLetters(words[j].w)) {
        const own = units ?? revealUnits([words[j]], true);
        return <span key={j} data-j={j} className={`cw${pickedWord === j ? " w-picked" : ""}`} style={{ ...st, visibility: undefined }}>{[...words[j].w].map((ch, k) => <span key={k} style={look(own[k].s)}>{ch}</span>)}</span>;
      }
      return <span key={j} data-j={j} className={`cw${pickedWord === j ? " w-picked" : ""}`} style={{ ...st, visibility: undefined, ...look(units?.[0]?.s ?? words[j].s) }}>{words[j].w}</span>;
    }
    return <span key={j} data-j={j} className={`cw${pickedWord === j ? " w-picked" : ""}`} style={st}>{words[j].w}</span>;
  };
  // Typo Block and Letter Rise: three lines at most (as the MP4)
  const typoBrk = s.effect === "typo" ? typoBreaks(words.length, typedBreaks(text)) : s.keyword?.line ? keywordRows(words.map((w) => w.w), kw, typedBreaks(text)) : null;
  const breakBefore = (j: number) => (typoBrk ? typoBrk.has(j - 1) : brk.has(j - 1)) || !!s.wordLines;
  const join = (from: number, to: number) => words.slice(from, to).flatMap((_, k) => [k ? (breakBefore(from + k) ? <br key={`br${from + k}`} /> : " ") : null, word(from + k)]);

  let body: React.ReactNode;
  const stacked = s.effect === "stack" && s.stack;
  if (stacked) {
    const chunks = stackChunks(caseOf(s, text), sub ?? "", start, end);
    const k = Math.max(0, chunks.findIndex((c) => time < c.e)), [a, b, d] = chunks[k]?.parts ?? ["", "", ""];
    const idx = chunks[k]?.idx ?? [[], -1, []];
    // A word the user coloured keeps its colour in its piece (as in the MP4).
    const small = (text: string, at: number[]) => text.split(" ").map((w, n) => [n ? " " : null, at[n] === undefined ? w : pick(at[n], w)]);
    const big = colors?.[idx[1]] ?? s.stack!.big;
    // glow: a soft halo of its own colour; rgb: red and cyan copies nudged apart (as in the MP4)
    const halo = [s.stack!.glow ? `0 0 .12em ${big}, 0 0 .3em ${big}99` : "", s.stack!.rgb ? `-.05em 0 #00E5FFB0, .05em 0 #FF2040B0` : ""].filter(Boolean).join(", ") || undefined;
    // with a gradient: the big word takes it too (unless coloured by hand), its halo drawn behind (a text-shadow would cover it)
    const bigLook: React.CSSProperties = grad
      ? { ...(colors?.[idx[1]] ? own(big) : {}), filter: halo && [s.stack!.glow ? `drop-shadow(0 0 .1em ${big})` : "", s.stack!.rgb ? `drop-shadow(-.05em 0 #00E5FFB0) drop-shadow(.05em 0 #FF2040B0)` : ""].join(" ") }
      : { color: big, textShadow: halo };
    body = <>{a && <span className="stack-small">{small(a, idx[0])}</span>}<span key={k} className="stack-big" style={{ ...bigLook, fontFamily: stack(s.stack!.font, s.fontTa), fontWeight: 400, fontSize: `${stackBig(b)}em`, lineHeight: 1.05 * g }}>{typeof idx[1] === "number" && idx[1] >= 0 ? pick(idx[1], b) : b}</span>{d && <span className="stack-small">{idx[2].length ? small(d, idx[2]) : d}</span>}</>;
  } else if (s.effect === "hook" && s.hook) {
    const h = s.hook, pieces = hookChunks(caseOf(s, text), start, end);
    const piece = pieces[Math.max(0, pieces.findIndex((c) => time < c.e))];
    // the MP4 fits a line in 90% of the space between the side margins; here 88cqw of the player
    body = piece?.lines.map((ln, j) => {
      const at = time - piece.s - j * HOOK_STEP, v = Math.min(1, Math.max(0, at / 0.18));
      const size = h.sizes[j % h.sizes.length], f = h.fonts?.[j % h.colors.length];
      return (
        <span key={`${piece.s}-${j}`} className="hook-line" style={{
          fontSize: `min(${size}em, calc(88cqw / ${Math.max(0.5, textWidth(ln.text, f ?? s.font, s.fontTa)).toFixed(3)}))`,
          color: h.colors[j % h.colors.length], fontFamily: f ? stack(f, s.fontTa) : undefined, opacity: v, filter: v < 1 ? `blur(${((1 - v) * 0.15).toFixed(3)}em)` : undefined, lineHeight: 1.02 * g,
        }}>{ln.text.split(" ").map((w, n) => [n ? " " : null, ln.idx[n] === undefined ? w : pick(ln.idx[n], w)])}</span>
      );
    });
  } else if (s.effect === "oneword") {
    // one word at a time, filling ~85% of the frame's width at most (its advance width 90%, as the MP4)
    body = <span style={{ fontSize: `min(1em, calc(90cqw / ${Math.max(0.3, textWidth(words[i].w, s.font, s.fontTa)).toFixed(3)}))` }}>{word(i)}</span>;
  } else if (s.effect === "corners") {
    // four words (two rows) at a time, as the MP4
    const groups = wordGroups(words, 4, end), g = groups[Math.max(0, groups.findIndex((x) => time < x.e))];
    const rows = cornerRows(words.slice(g.from, g.to).map((_, n) => g.from + n));
    body = <span className="corners">{rows.flatMap((r) => r.map((j, side) => <span key={j} style={{ justifySelf: side ? "end" : "start", visibility: time < words[j].s ? "hidden" : undefined }}>{word(j)}</span>))}</span>;
  } else if (s.effect === "cine") {
    // Three lines (as the MP4): an inverted pyramid, the middle one big, bold and in capitals, each shrunk to fit the
    // width between the side margins; each word settling out of a blur as it's said, in its place.
    const rows = cineRows(words.length, typedBreaks(text)), big = cineBig(rows), roomCqw = (1 - s.safe.left - s.safe.right) * 95;
    const settle = (t0: number): React.CSSProperties => {
      const since = time - t0;
      if (since < 0) return { visibility: "hidden" };
      const c = Math.min(1, since / 0.42), e = 1 - Math.pow(1 - c, 3);
      return c >= 1 ? {} : { display: "inline-block", opacity: Math.min(1, since / 0.3), filter: `blur(${((1 - c) * 0.25).toFixed(3)}em)`, transform: `scale(${(1.12 - 0.12 * e).toFixed(3)})` };
    };
    const widthOf = ([a, b]: [number, number], r: number) => Math.max(0.3, textWidth(words.slice(a, b).map((w) => (r === big ? w.w.toUpperCase() : w.w)).join(" "), r === big ? cineFont(s) : s.font, s.fontTa)).toFixed(3);
    const bigSize = `min(${CINE_BIG}em, calc(${roomCqw.toFixed(1)}cqw / ${widthOf(rows[big], big)}))`; // the others stay CINE_OVER smaller
    body = <span className="cine">{rows.map(([a, b], r) => {
      return <span key={a} style={r === big
        ? { fontSize: bigSize, fontFamily: stack(cineFont(s), s.fontTa), fontWeight: 800, textTransform: "uppercase" }
        : { fontSize: `min(1em, calc(${roomCqw.toFixed(1)}cqw / ${widthOf([a, b], r)}), calc(${bigSize} / ${CINE_OVER}))` }}>
        {words.slice(a, b).map((_, n) => [n ? " " : null, <span key={n} style={settle(words[a + n].s)}>{word(a + n)}</span>])}
      </span>;
    })}</span>;
  } else if (s.wordLines) {
    // a word a line, three words at a time (as the MP4)
    const groups = wordGroups(words, 3, end), g = groups[Math.max(0, groups.findIndex((x) => time < x.e))];
    // a long word shrinks to fit the width (as the MP4)
    body = words.slice(g.from, g.to).flatMap((w, n) => [n ? <br key={`br${n}`} /> : null, <span key={`w${n}`} style={{ fontSize: `min(1em, calc(85cqw / ${Math.max(0.3, textWidth(w.w, s.font, s.fontTa)).toFixed(3)}))` }}>{word(g.from + n)}</span>]);
  } else if (s.effect === "typewriter") {
    const chars = [...breakLines(caseOf(s, text), s.lines)];
    body = <>{chars.slice(0, Math.max(1, Math.ceil(chars.length * Math.min(1, p / 0.8)))).join("")}<span className="caret">_</span></>;
  } else if (s.effect === "solo") {
    body = <>{i > 0 && <span className="solo-prev">{pick(i - 1, words[i - 1].w)}</span>}<span key={i} className="solo-now">{pick(i, words[i].w)}</span></>;
  } else if (s.effect === "punch" && words.length > 2) {
    const cut = words.length - Math.min(2, words.length - 1);
    // Setup & Punch Pro: the editor draws the caption twice, plain without the punch and blended with only it (as the MP4)
    body = <><span className="punch-a" style={part === "punch" ? hide : undefined}>{join(0, cut)}</span><span className="punch-b" style={part === "plain" ? hide : undefined}>{join(cut, words.length)}</span></>;
  } else if (s.effect === "vhs" || s.effect === "crawl") {
    body = breakLines(caseOf(s, text), s.lines);
  } else if (s.keyword?.line && typoBrk) {
    // Letter Rise: three lines (before the keyword, the keyword, after it), each shrunk to fit the width (as the MP4)
    const roomCqw = (1 - s.safe.left - s.safe.right) * 95, starts = [0, ...[...typoBrk].sort((a, b) => a - b).map((b) => b + 1)].filter((a) => a < words.length);
    body = starts.map((a, r) => {
      const to = r + 1 < starts.length ? starts[r + 1] : words.length;
      const em = (j: number) => textWidth(words[j].w, (j === kw && s.keyword?.font) || s.font, s.fontTa) * (j === kw ? s.keyword?.scale ?? 1 : 1);
      const tw = Math.max(0.3, words.slice(a, to).reduce((t, _, n) => t + em(a + n), 0) + (to - a - 1) * textWidth(" ", s.font, s.fontTa));
      return <span key={a} className="typo-row" style={{ fontSize: `min(1em, calc(${roomCqw.toFixed(1)}cqw / ${tw.toFixed(3)}))` }}>
        {words.slice(a, to).map((_, n) => [n ? " " : null, word(a + n)])}</span>;
    });
  } else if (s.effect === "typo" && typoBrk) {
    // Typo Block: three lines at most, each shrunk to fit the width when it's long (as the MP4)
    const roomCqw = (1 - s.safe.left - s.safe.right) * 95, starts = [0, ...[...typoBrk].sort((a, b) => a - b).map((b) => b + 1)].filter((a) => a < words.length);
    body = starts.map((a, r) => {
      const to = r + 1 < starts.length ? starts[r + 1] : words.length;
      const em = (j: number) => textWidth(words[j].w, (typoSize(j) > 1 && s.typoBig?.font) || s.font, s.fontTa) * typoSize(j);
      const tw = Math.max(0.3, words.slice(a, to).reduce((t, _, n) => t + em(a + n), 0) + (to - a - 1) * textWidth(" ", s.font, s.fontTa) * 0.55);
      return <span key={a} className="typo-row" style={{ fontSize: `min(1em, calc(${roomCqw.toFixed(1)}cqw / ${tw.toFixed(3)}))` }}>
        {words.slice(a, to).map((_, n) => [n ? " " : null, word(a + n)])}</span>;
    });
  } else if (s.effect === "cardslide" && s.cardSlide && words.length) {
    // a small line on a card over the big line's left part, the big line, the last word in script under its right end
    // (as the MP4, placed by the big line's baseline): the card and its words slide in from the left fading in (easing
    // in and out), the big line pops in letter by letter (each fading in, sliding up), the last word writes itself on
    const cs = s.cardSlide, L = cardSlide(words.map((w) => w.w), s, ratio);
    const f1 = L.topSize, f3 = L.lastSize, bB = cssBaseline(s.font), cardH = CARD_AT.h * f1, b3 = cssBaseline(cs.lastFont) * f3;
    const Tp = L.top.length ? Math.max(0, cardH / 2 - bB - CARD_AT.mid) : 0, base = Tp + bB;
    const Bp = L.last.length ? Math.max(0, base + CARD_AT.lastBase - b3 + f3 - (Tp + 1)) : 0;
    const since = (t: number) => (time - t) * 1000;
    const slide = L.top.length ? easeInOut(since(words[L.top[0]].s) / CARD_TIME.slide) : 0;
    const letters = [...new Intl.Segmenter().segment(L.big.map((j) => words[j].w).join(" "))].map((g) => g.segment);
    const t0 = words[L.big[0]].s;
    let k = 0;
    const letter = (ch: string, i: number) => {
      if (/\s/.test(ch)) return <span key={i}>{ch}</span>;
      const e = easeInOut(since(t0 + (k++ * CARD_TIME.step) / 1000) / CARD_TIME.letter);
      return <span key={i} className="cs-letter" style={{ transform: `translateY(${((1 - e) * 0.35).toFixed(3)}em) scaleY(${(0.4 + 0.6 * e).toFixed(3)})`, opacity: e,
        ...(grad ? { backgroundImage: `linear-gradient(${grad[0]} ${GRADIENT_STOPS[0] * 100}%, ${grad[1]} ${GRADIENT_STOPS[1] * 100}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" } : { color: s.color }) }}>{ch}</span>;
    };
    const write = L.last.length ? easeInOut(since(words[L.last[0]].s) / CARD_TIME.write) : 0;
    body = <span className="card-slide" style={{ fontFamily: stack(s.font, s.fontTa), padding: `${Tp.toFixed(3)}em 0 ${Bp.toFixed(3)}em`, fontSize: `${L.zB.toFixed(3)}em` }}>
      {L.top.length > 0 && <span className="cs-card" style={{ left: `${L.cardLeft.toFixed(3)}em`, top: `${(base + CARD_AT.mid - cardH / 2).toFixed(3)}em`, width: `${L.cardW.toFixed(3)}em`, height: `${cardH.toFixed(3)}em`,
        borderRadius: `${(CARD_AT.radius * cardH).toFixed(3)}em`, background: cs.card, transform: `translateX(${(-(1 - slide) * CARD_TIME.from * f1).toFixed(3)}em)`, opacity: slide,
        fontFamily: stack(cs.cardFont, s.fontTa) }}>
        <span style={{ fontSize: `${f1.toFixed(3)}em`, lineHeight: 1, padding: `0 ${CARD_AT.pad}em` }}>{L.top.flatMap((j, m) => [m ? " " : null, <span key={j}>{word(j)}</span>])}</span>
      </span>}
      <span className="cs-big">{letters.map(letter)}</span>
      {L.last.length > 0 && <span className="cs-last" style={{ fontFamily: stack(cs.lastFont, s.fontTa), fontSize: `${f3.toFixed(3)}em`, top: `${((base + CARD_AT.lastBase - b3) / f3).toFixed(3)}em`,
        right: `${((L.bigW - L.lastRight) / f3).toFixed(3)}em`, opacity: since(words[L.last[0]].s) < 0 ? 0 : Math.min(1, since(words[L.last[0]].s) / 120),
        clipPath: `inset(-0.6em calc(${(1 - write).toFixed(3)} * (100% + 0.8em) - 0.4em) -0.6em -0.4em)` }}>
        {L.last.flatMap((j, m) => [m ? " " : null, <span key={j}>{word(j)}</span>])}</span>}
    </span>;
  } else if (s.effect === "boldbar" && s.boldBar && words.length) {
    // small words over a big bold word on a bar (a row or two), the words after it in script under its right end (as
    // the MP4, placed by the big word's baseline): each small word punches up as it's said, the big word and bar wipe
    // in, the last line rises in
    const bb = s.boldBar, L = boldBar(words.map((w) => w.w), s, ratio), roomCqw = (1 - s.safe.left - s.safe.right) * 95;
    const f1 = L.topSize, f3 = L.lastSize, bB = cssBaseline(s.font), b1 = cssBaseline(bb.topFont) * f1, b3 = cssBaseline(bb.lastFont) * f3;
    const rowBase = (r: number) => BAR_AT.topBase - (L.topRows.length - 1 - r) * BAR_AT.rowGap * f1; // a top row's baseline, from the big one's (em)
    const Tp = L.topRows.length ? Math.max(0, b1 - bB - rowBase(0)) : 0, base = Tp + bB; // the big word's baseline, from the block's top (em)
    const lastTop = (r: number) => base + BAR_AT.lastBase + r * BAR_AT.rowGap * f3 - b3; // a last line's top (em)
    const lastBottom = L.last.length ? lastTop(L.lastLines.length - 1) + f3 : 0, Bp = Math.max(0, lastBottom - (Tp + 1));
    const since = (j: number) => (time - words[j].s) * 1000;
    const punch = (j: number): React.CSSProperties => {
      const t = since(j), [p1, p2] = [BAR_TIME.punch * 0.6, BAR_TIME.punch];
      const k = t < 0 ? 0 : t < p1 ? 0.3 + (0.85 * t) / p1 : t < p2 ? 1.15 - (0.15 * (t - p1)) / (p2 - p1) : 1;
      return { display: "inline-block", transformOrigin: "50% 100%", transform: `scale(${k.toFixed(3)})`, opacity: t < 0 ? 0 : Math.min(1, t / 60) };
    };
    const bwEm = L.bigW + 2 * BAR_AT.pad, wp = Math.min(1, Math.max(0, since(L.big) / BAR_TIME.wipe)), shown = wp * bwEm - BAR_AT.pad; // the wipe's edge, from the word's left (em)
    const rise = L.last.length ? Math.min(1, Math.max(0, since(L.last[0]) / BAR_TIME.rise)) : 0;
    body = <span className="bold-bar" style={{ fontFamily: stack(s.font, s.fontTa), padding: `${Tp.toFixed(3)}em 0 ${Bp.toFixed(3)}em`, fontSize: `${L.zB.toFixed(3)}em` }}>
      <span className="bb-bar" style={{ top: `${(base + BAR_AT.top).toFixed(3)}em`, height: `${(BAR_AT.bottom - BAR_AT.top).toFixed(3)}em`, left: `${-BAR_AT.pad}em`, right: `${-BAR_AT.pad}em`,
        background: `linear-gradient(90deg, ${bb.colors[0]}, ${bb.colors[1]})`, clipPath: `inset(0 ${((1 - wp) * bwEm).toFixed(3)}em 0 0)` }} />
      {L.topRows.map((row, r) => <span key={r} className="bb-top" style={{ fontFamily: stack(bb.topFont, s.fontTa), fontSize: `${f1.toFixed(3)}em`,
        top: `${((base + rowBase(r) - b1) / f1).toFixed(3)}em`, left: `${(row.left / f1).toFixed(3)}em`, width: `${(row.spread / f1).toFixed(3)}em`,
        justifyContent: row.idx.length === 1 ? "center" : "space-between" }}>
        {row.idx.map((j) => <span key={j} style={punch(j)}>{word(j)}</span>)}
      </span>)}
      <span className="bb-big" style={{ clipPath: `inset(-1em ${(L.bigW - shown).toFixed(3)}em -1em -1em)`, visibility: since(L.big) < 0 ? "hidden" : undefined }}>{word(L.big)}</span>
      {L.lastLines.map((line, r) => <span key={r} className="bb-last" style={{ fontFamily: stack(bb.lastFont, s.fontTa), fontSize: `${f3}em`, top: `${(lastTop(r) / f3).toFixed(3)}em`, right: `${((L.bigW - line.right) / f3).toFixed(3)}em`,
        transform: `translateY(${((1 - rise) * 0.5).toFixed(3)}em)`, opacity: since(L.last[0]) < 0 ? 0 : Math.min(1, rise / 0.7) }}>
        {line.idx.flatMap((j, m) => [m ? " " : null, <span key={j}>{word(j)}</span>])}</span>)}
    </span>;
  } else if (s.effect === "boxpunch" && s.boxPunch && words.length) {
    // the set-up on a line or two, its words appearing as said; the punch in a box under it (as the MP4): the box wipes
    // in from the left just before the punch is said, then the punch rises into it from below (cut off by the box), fading in
    const bp = s.boxPunch, cut = boxPunchCut(words.length), roomCqw = (1 - s.safe.left - s.safe.right) * 95, ms = (time - start) * 1000;
    const setRows = boxPunchRows(words.slice(0, cut).map((w) => w.w), s, ratio);
    const t0 = boxStart((words[cut].s - start) * 1000), wipe = Math.min(1, Math.max(0, (ms - t0) / BOX_WIPE)), up = Math.min(1, Math.max(0, (ms - t0 - BOX_WIPE) / BOX_RISE));
    const tw = (a: number, b: number, f: string) => Math.max(0.3, textWidth(words.slice(a, b).map((w) => w.w).join(" "), f, s.fontTa)).toFixed(3);
    const side = s.textAlign === "left" ? "flex-start" : s.textAlign === "right" ? "flex-end" : "center";
    body = <span className="stagger box-punch" style={{ alignItems: side }}>
      {setRows.map(([a, b]) => <span key={`r${a}`} style={{ fontSize: `min(1em, calc(${roomCqw.toFixed(1)}cqw / ${Math.max(...setRows.map(([x, y]) => +tw(x, y, s.font))).toFixed(3)}))` }}>
        {words.slice(a, b).flatMap((_, m) => [m ? " " : null, <span key={`s${a + m}`} style={time < words[a + m].s && a + m ? { visibility: "hidden" } : undefined}>{word(a + m)}</span>])}
      </span>)}
      <span className="bp-box" style={{ fontFamily: stack(bp.font, s.fontTa), padding: `0 ${BOX_PAD.x}em`, height: `${bp.h ?? BOX_PAD.h}em`, lineHeight: `${bp.h ?? BOX_PAD.h}em`,
        fontSize: `min(${bp.scale}em, calc(${(roomCqw * 0.92).toFixed(1)}cqw / ${(+tw(cut, words.length, bp.font) + 2 * BOX_PAD.x).toFixed(3)}))`, visibility: ms < t0 ? "hidden" : undefined }}>
        <span className="bp-bg" style={{ background: bp.color, transform: `scaleX(${wipe.toFixed(3)})` }} />
        <span className="bp-text" style={{ transform: `translateY(${((1 - up) * (bp.h ?? BOX_PAD.h) - BOX_PAD.lift).toFixed(3)}em)`, opacity: up }}>
          {words.slice(cut).flatMap((_, m) => [m ? " " : null, <span key={`p${m}`}>{word(cut + m)}</span>])}
        </span>
      </span>
    </span>;
  } else if (s.effect === "spark" && s.spark) {
    // three lines flush left (as the MP4): the first sliding in from the left, the big middle one in its font and
    // capitals (shrunk to fit), the last in its font; the star bobbing in behind the first line's start
    const sp = s.spark, starts = [0, ...[...brk].filter((b) => b < words.length - 1).sort((a, b) => a - b).map((b) => b + 1)];
    const n = starts.length, mid = n > 2 ? 1 : n - 1, last = n - 1, roomCqw = (1 - s.safe.left - s.safe.right) * 95;
    const ms = Math.max(0, (time - start) * 1000), [slideMs, slideEm] = SPARK_SLIDE, slid = Math.min(1, ms / slideMs);
    // the star slides up into place, then spins slowly and evenly till the caption ends (as the MP4)
    const [upMs, upEm] = STAR_SLIDE, rise = (1 - Math.min(1, ms / upMs)) * upEm, turn = starSpin((end - start) * 1000);
    const spin = turn.deg * Math.min(1, Math.max(0, (ms - turn.from) / (turn.to - turn.from)));
    // a later line's word slides up as it's said (hidden before)
    const [wordMs, wordEm] = SPARK_WORD_UP;
    const wordUp = (j: number): React.CSSProperties => {
      const v = Math.min(1, Math.max(0, (time - words[j].s) * 1000 / wordMs));
      return time < words[j].s ? { display: "inline-block", visibility: "hidden" } : { display: "inline-block", transform: `translateY(${((1 - v) * wordEm).toFixed(3)}em)`, opacity: Math.min(1, v * 2) };
    };
    body = <span className="stagger">{starts.map((a, r) => {
      const to = r + 1 < n ? starts[r + 1] : words.length, big = r === mid, font = big ? sp.bigFont : r === last && n > 2 ? sp.lastFont : s.font;
      const tw = Math.max(0.3, textWidth(words.slice(a, to).map((w) => (big ? w.w.toUpperCase() : w.w)).join(" "), font, s.fontTa)).toFixed(3);
      const text = r === 0 ? join(a, to).filter((x) => typeof x !== "object" || x === null || (x as React.ReactElement).type !== "br")
        : words.slice(a, to).flatMap((_, m) => [m ? " " : null, <span key={`u${a + m}`} style={wordUp(a + m)}>{word(a + m)}</span>]);
      return <span key={a} style={{ textAlign: "left", position: "relative", fontFamily: stack(font, s.fontTa), lineHeight: lineScale(font) * (sp.tight ?? 1) * (s.lineHeight ?? 1),
        ...(big ? { textTransform: "uppercase" } : {}), fontSize: `min(${big ? sp.big : 1}em, calc(${(roomCqw * SPARK_FIT).toFixed(1)}cqw / ${tw}))` }}>
        {r === 0 && <svg className="spark-star" viewBox="-1 -1 2 2" aria-hidden="true" style={{ left: `${STAR_AT.dx - STAR_AT.r}em`, top: `calc(50% + ${(STAR_AT.dy - STAR_AT.r + rise).toFixed(3)}em)`,
          width: `${2 * STAR_AT.r}em`, height: `${2 * STAR_AT.r}em`, opacity: Math.min(1, ms / upMs), transform: `rotate(${spin.toFixed(1)}deg)` }}>
          <path d={STAR_PATH} fill={sp.star} />
        </svg>}
        <span style={{ position: "relative", display: "inline-block", ...(r === 0 ? { transform: `translateX(${(-(1 - slid) * slideEm).toFixed(3)}em)`, opacity: Math.min(1, ms / (slideMs * 0.6)) } : {}) }}>{text}</span>
      </span>;
    })}</span>;
  } else if (s.stagger) {
    // staggered lines (as the MP4): the first flush left, the middle centred, the last flush right, each its colour,
    // the middle one heavier (an outline of its own colour)
    const st = s.stagger, starts = [0, ...[...brk].filter((b) => b < words.length - 1).sort((a, b) => a - b).map((b) => b + 1)];
    // the middle line big, or with two lines the second (one line: it), as the MP4
    const n = starts.length, last = n - 1, mid = n > 2 ? 1 : last, roomCqw = (1 - s.safe.left - s.safe.right) * 95;
    // as the MP4's blurred edge and shadow (the Shadow's colour and size): strong behind the big line, faint behind the thin ones
    const gk = (s.shadow ?? 0) / GLOW, gc = (s.shadowColor ?? "#7F011F").slice(0, 7), em = (n: number) => `${(n * gk).toFixed(3)}em`;
    const glowOf = (big: boolean) => (st.glow && s.shadow ? `${em(0.035)} ${em(0.035)} ${em(0.07)} ${gc}${big ? "bb" : "5c"}, 0 0 ${em(0.1)} ${gc}${big ? "99" : "4d"}` : "none");
    // set to the big line's edges only when it's the widest, else every line centred (as the MP4)
    const flush = staggerFlush(starts.map((a, r) => words.slice(a, r + 1 < n ? starts[r + 1] : words.length).map((w) => w.w).join(" ")), s);
    body = <span className="stagger">{starts.map((a, r) => {
      const col = st.colors[r === mid ? 1 : r === last ? 2 : 0] ?? s.color, to = r + 1 < n ? starts[r + 1] : words.length;
      const big = !!st.big && r === mid, font = big && st.bigFont ? st.bigFont : s.font;
      const shown = !part || !s.blendMid || big === (part === "punch"); // a blended middle line: drawn apart (as the MP4)
      const tw = Math.max(0.3, textWidth(words.slice(a, to).map((w) => (big ? w.w.toUpperCase() : w.w)).join(" "), font, s.fontTa)).toFixed(3);
      return <span key={a} style={{ textAlign: !flush || r === mid ? "center" : r === 0 ? "left" : r === last ? "right" : "center", ...(grad ? {} : { color: col }),
        ...(r === mid && st.bold ? { WebkitTextStroke: `${st.bold * 2}em ${col}` } : {}),
        ...(st.glow && !grad ? { textShadow: glowOf(big) } : {}), // (none when the Shadow is off: not the caption's own)
        ...(st.tight ? { lineHeight: lineScale(font) * st.tight * (s.lineHeight ?? 1) } : {}),
        ...(big ? { fontFamily: stack(font, s.fontTa), textTransform: "uppercase", fontSize: `min(${st.big}em, calc(${roomCqw.toFixed(1)}cqw / ${tw}))` } : {}), ...(shown ? {} : hide) }}>
        {join(a, to).filter((x) => typeof x !== "object" || x === null || (x as React.ReactElement).type !== "br")}</span>;
    })}</span>;
  } else {
    body = join(0, words.length);
  }
  // a punch-only blend: a caption too short to have a set-up is all punch
  const allPunch = part === "plain" && !!s.blendPunch && !(s.effect === "punch" && words.length > 2);

  return (
    <div className={`cap${s.effect ? ` fx-${s.effect}` : ""}${s.textAlign && s.textAlign !== "center" ? ` ta-${s.textAlign}` : ""}`} style={{ "--p": p, ...wrap, mixBlendMode: s.blend && !part ? BLENDS[s.blend][1] : undefined } as React.CSSProperties}>
      <span className={`cap-main${grad && s.effect !== "cardslide" ? " grad" : ""}`} style={{ ...(grad && s.effect !== "cardslide" ? { ...gradBase, "--grad": `linear-gradient(${grad[0]} ${GRADIENT_STOPS[0] * 100}%, ${grad[1]} ${GRADIENT_STOPS[1] * 100}%)` } as React.CSSProperties : base), ...(allPunch ? hide : {}) }} data-text={s.effect === "vhs" ? breakLines(caseOf(s, text), s.lines) : undefined}>
        {grad && s.effect !== "cardslide" ? <span className="cap-grad">{body}</span> : body /* (Card Slide: only its big line in the gradient) */}
      </span>
      {sub && !stacked && <span className="cap-sub" style={{ ...(part === "punch" ? hide : {}), fontFamily: stack(s.font, s.fontTa), letterSpacing: s.spacing ? `${s.spacing}em` : undefined, lineHeight: lineScale(s.font), marginTop: `${(g - 1) * 0.5 * lineBox(s, text)}em` }}>{sub}</span>}
    </div>
  );
}
