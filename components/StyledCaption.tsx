"use client";
import { byLetters, caseOf, CINE_BIG, CINE_OVER, cineBig, cineFont, cineRows, GRADIENT_STOPS, highlights, lineBox, lineCount, spacesLines, takesLineSpacing, nameOrKeyword, wordGroups, cornerRows, FLICKER, FLICKER2, flickerOn, HOOK_STEP, hookChunks, keywordIndex, resolveStyle, RISE, RISE_DY, revealUnits, stackBig, stackChunks, typoBreak, typoSize, wordTimes, type CaptionCustom } from "@/lib/captionStyles";
import { lineScale, textWidth } from "@/lib/fontWidths";
import { breakLines, lineBreaks } from "@/lib/subtitles";

type Props = {
  styleId: string; custom?: CaptionCustom; text: string; sub?: string; start: number; end: number; time: number;
  starts?: number[];             // when each word starts (measured or edited), else shared by length
  colors?: (string | null)[];    // a colour per word the user picked
  ratio?: number;                // the frame's width ÷ height: with line spacing, lines break where the MP4's do
};

/** A font for the Latin letters, then the Tamil font for Tamil letters (the Latin caption fonts have none). */
const stack = (font: string, tamil?: string) => `"${font}", ${tamil ? `"${tamil}", ` : ""}"Noto Emoji", var(--font-tamil), "Nirmala UI", "Noto Sans", sans-serif`; // one-colour emoji, as in the MP4

/**
 * A caption line drawn in a caption style at a moment in time. Mirrors buildAss() in lib/captionStyles.ts
 * so the editor preview matches the burned-in MP4. Sized in container units: the parent needs container-type: size.
 */
export default function StyledCaption({ styleId, custom, text, sub, start, end, time, starts, colors: picked, ratio }: Props) {
  const s = resolveStyle(styleId, custom);
  const colors = highlights(s) ? picked : undefined; // Word Cut: no words picked out
  // Gradient text: the letters filled top colour → bottom colour on each line (a word with its own colour keeps it).
  const grad = s.gradient ?? null;
  const words = wordTimes(caseOf(s, text), start, end, starts);
  const kw = s.keyword?.line ? nameOrKeyword(wordTimes(text, start, end).map((w) => w.w)) : keywordIndex(words.map((w) => w.w));
  // Lines as tall as libass draws them (its font's own line height), × the line spacing in the plain layout; with
  // spacing set, broken at the same words as the MP4 (lineCount), which places each line itself.
  const g = takesLineSpacing(s) ? s.lineHeight ?? 1 : 1, lh = lineBox(s, text) * g;
  const brk = lineBreaks(words.map((w) => w.w), ratio && spacesLines(s) && Math.abs(g - 1) > 0.005 ? lineCount(s, caseOf(s, text), ratio) : s.lines);
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

  const word = (j: number) => {
    const state = j < i ? "past" : j === i ? "active" : "future";
    const st: React.CSSProperties = {};
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
    if (j === kw && s.keyword && state !== "future") {
      if (s.keyword.color) st.color = s.keyword.color;
      if (s.keyword.font) st.fontFamily = stack(s.keyword.font, s.fontTa);
      if (s.keyword.italic) st.fontStyle = "italic";
      if (s.keyword.grow) st.transform = "scale(1.18)";
      if (s.keyword.scale) st.fontSize = `${s.keyword.scale}em`;
    }
    if (s.effect === "typo") st.fontSize = `${typoSize(j)}em`;
    if (s.anim === "wordin") { // each word blurs in as it's said; the ones to come are hidden
      if (state === "future") st.visibility = "hidden";
      if (state === "active") { const w = Math.min(1, Math.max(0, (time - words[j].s) / 0.16)); st.opacity = w; st.filter = `blur(${((1 - w) * 0.3).toFixed(3)}em)`; }
    }
    if (s.effect === "wobble") st.transform = `${st.transform ?? ""} rotate(${j % 2 ? -4 : 3}deg)`;
    if (colors?.[j] && state !== "future") st.color = colors[j]!;
    if (grad && st.color) st.WebkitTextFillColor = st.color; // its own colour, over the gradient
    if (s.reveal || s.effect === "typo") {
      // Each word (or letter) comes in as it's said, in its final place (as the MP4's layers).
      const reveal = s.reveal ?? "rise";
      const look = (t0: number): React.CSSProperties => {
        const since = time - t0;
        if (since < 0) return { visibility: "hidden" };
        if (reveal === "flicker") return { opacity: flickerOn(FLICKER2, since * 1000) ? 1 : 0 };
        const v = Math.min(1, since / RISE);
        return v >= 1 ? {} : { display: "inline-block", opacity: v, transform: `translateY(${((1 - v) * RISE_DY).toFixed(3)}em)` };
      };
      if (reveal === "letters" && byLetters(words[j].w)) {
        const units = revealUnits([words[j]], true);
        return <span key={j} className="cw" style={{ ...st, visibility: undefined }}>{[...words[j].w].map((ch, k) => <span key={k} style={look(units[k].s)}>{ch}</span>)}</span>;
      }
      return <span key={j} className="cw" style={{ ...st, visibility: undefined, ...look(words[j].s) }}>{words[j].w}</span>;
    }
    return <span key={j} className="cw" style={st}>{words[j].w}</span>;
  };
  const breakBefore = (j: number) => brk.has(j - 1) || !!s.wordLines || (s.effect === "typo" && typoBreak(j - 1, words.length)) || (!!s.keyword?.line && (j === kw || j === kw + 1));
  const join = (from: number, to: number) => words.slice(from, to).flatMap((_, k) => [k ? (breakBefore(from + k) ? <br key={`br${from + k}`} /> : " ") : null, word(from + k)]);

  let body: React.ReactNode;
  const stacked = s.effect === "stack" && s.stack;
  if (stacked) {
    const chunks = stackChunks(caseOf(s, text), sub ?? "", start, end);
    const k = Math.max(0, chunks.findIndex((c) => time < c.e)), [a, b, d] = chunks[k]?.parts ?? ["", "", ""];
    const idx = chunks[k]?.idx ?? [[], -1, []];
    // A word the user coloured keeps its colour in its piece (as in the MP4).
    const small = (text: string, at: number[]) => text.split(" ").map((w, n) => [n ? " " : null, colors?.[at[n]] ? <span key={n} style={own(colors[at[n]]!)}>{w}</span> : w]);
    const big = colors?.[idx[1]] ?? s.stack!.big;
    // glow: a soft halo of its own colour; rgb: red and cyan copies nudged apart (as in the MP4)
    const halo = [s.stack!.glow ? `0 0 .12em ${big}, 0 0 .3em ${big}99` : "", s.stack!.rgb ? `-.05em 0 #00E5FFB0, .05em 0 #FF2040B0` : ""].filter(Boolean).join(", ") || undefined;
    // with a gradient: the big word takes it too (unless coloured by hand), its halo drawn behind (a text-shadow would cover it)
    const bigLook: React.CSSProperties = grad
      ? { ...(colors?.[idx[1]] ? own(big) : {}), filter: halo && [s.stack!.glow ? `drop-shadow(0 0 .1em ${big})` : "", s.stack!.rgb ? `drop-shadow(-.05em 0 #00E5FFB0) drop-shadow(.05em 0 #FF2040B0)` : ""].join(" ") }
      : { color: big, textShadow: halo };
    body = <>{a && <span className="stack-small">{small(a, idx[0])}</span>}<span key={k} className="stack-big" style={{ ...bigLook, fontFamily: stack(s.stack!.font, s.fontTa), fontWeight: 400, fontSize: `${stackBig(b)}em` }}>{b}</span>{d && <span className="stack-small">{idx[2].length ? small(d, idx[2]) : d}</span>}</>;
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
          color: h.colors[j % h.colors.length], fontFamily: f ? stack(f, s.fontTa) : undefined, opacity: v, filter: v < 1 ? `blur(${((1 - v) * 0.15).toFixed(3)}em)` : undefined,
        }}>{ln.text.split(" ").map((w, n) => [n ? " " : null, colors?.[ln.idx[n]] ? <span key={n} style={own(colors[ln.idx[n]]!)}>{w}</span> : w])}</span>
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
    const rows = cineRows(words.length), big = cineBig(rows), roomCqw = (1 - s.safe.left - s.safe.right) * 95;
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
    body = <>{i > 0 && <span className="solo-prev">{words[i - 1].w}</span>}<span key={i} className="solo-now">{words[i].w}</span></>;
  } else if (s.effect === "punch" && words.length > 2) {
    const cut = words.length - Math.min(2, words.length - 1);
    body = <><span className="punch-a">{join(0, cut)}</span><span className="punch-b">{join(cut, words.length)}</span></>;
  } else if (s.effect === "vhs" || s.effect === "crawl") {
    body = breakLines(caseOf(s, text), s.lines);
  } else {
    body = join(0, words.length);
  }

  return (
    <div className={`cap${s.effect ? ` fx-${s.effect}` : ""}${s.textAlign && s.textAlign !== "center" ? ` ta-${s.textAlign}` : ""}`} style={{ "--p": p, ...wrap } as React.CSSProperties}>
      <span className={`cap-main${grad ? " grad" : ""}`} style={grad ? { ...gradBase, "--grad": `linear-gradient(${grad[0]} ${GRADIENT_STOPS[0] * 100}%, ${grad[1]} ${GRADIENT_STOPS[1] * 100}%)` } as React.CSSProperties : base} data-text={s.effect === "vhs" ? breakLines(caseOf(s, text), s.lines) : undefined}>
        {grad ? <span className="cap-grad">{body}</span> : body}
      </span>
      {sub && !stacked && <span className="cap-sub" style={{ fontFamily: stack(s.font, s.fontTa), letterSpacing: s.spacing ? `${s.spacing}em` : undefined, lineHeight: lineScale(s.font), marginTop: `${(g - 1) * 0.5 * lineBox(s, text)}em` }}>{sub}</span>}
    </div>
  );
}
