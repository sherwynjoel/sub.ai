"use client";
import { caseOf, keywordIndex, resolveStyle, stackBig, stackChunks, wordTimes, type CaptionCustom } from "@/lib/captionStyles";
import { breakLines, lineBreaks } from "@/lib/subtitles";

type Props = {
  styleId: string; custom?: CaptionCustom; text: string; sub?: string; start: number; end: number; time: number;
  starts?: number[];             // when each word starts (measured or edited), else shared by length
  colors?: (string | null)[];    // a colour per word the user picked
};

/** A font for the Latin letters, then the Tamil font for Tamil letters (the Latin caption fonts have none). */
const stack = (font: string, tamil?: string) => `"${font}", ${tamil ? `"${tamil}", ` : ""}"Noto Emoji", var(--font-tamil), "Nirmala UI", "Noto Sans", sans-serif`; // one-colour emoji, as in the MP4

/**
 * A caption line drawn in a caption style at a moment in time. Mirrors buildAss() in lib/captionStyles.ts
 * so the editor preview matches the burned-in MP4. Sized in container units: the parent needs container-type: size.
 */
export default function StyledCaption({ styleId, custom, text, sub, start, end, time, starts, colors }: Props) {
  const s = resolveStyle(styleId, custom);
  const words = wordTimes(caseOf(s, text), start, end, starts);
  const kw = keywordIndex(words.map((w) => w.w));
  const brk = lineBreaks(words.map((w) => w.w), s.lines);
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
  };
  // Entrance, from the playhead (so scrubbing shows what the MP4 will): 0.25 s or less on short captions.
  const k = Math.min(1, Math.max(0, (time - start) / Math.max(0.05, Math.min(0.25, (end - start) * 0.4))));
  const ease = 1 - Math.pow(1 - k, 3);
  const enter: React.CSSProperties = {};
  if (s.anim === "fade") enter.opacity = k;
  else if (s.anim === "pop") enter.transform = `scale(${0.6 + 0.4 * ease})`;
  else if (s.anim === "zoom") enter.transform = `scale(${ease})`;
  else if (s.anim === "bounce") enter.transform = `scale(${k < 0.6 ? 0.4 + (1.18 - 0.4) * (k / 0.6) : 1.18 - 0.18 * ((k - 0.6) / 0.4)})`;
  else if (s.anim === "slide") { enter.transform = `translateY(${(1 - ease) * 0.6}em)`; enter.opacity = Math.min(1, k / 0.6); }
  const wrap: React.CSSProperties = {
    ...enter,
    opacity: Number(enter.opacity ?? 1) * (s.opacity ?? 1),
    transform: [enter.transform, s.rotate ? `rotate(${s.rotate}deg)` : ""].filter(Boolean).join(" ") || undefined,
  };

  const word = (j: number) => {
    const state = j < i ? "past" : j === i ? "active" : "future";
    const st: React.CSSProperties = {};
    if (state === "future") {
      if (s.future === null) st.visibility = "hidden";
      else if (s.future) st.color = s.future;
    }
    if (state === "active") {
      if (s.active) st.color = s.active;
      if (s.mark) Object.assign(st, { background: s.mark, borderRadius: ".14em", padding: "0 .12em", textShadow: "none" });
      if (s.underline) st.textDecoration = "underline";
      if (s.activeGrow) st.transform = "scale(1.15)";
    }
    if (j === kw && s.keyword && state !== "future") {
      if (s.keyword.color) st.color = s.keyword.color;
      if (s.keyword.font) st.fontFamily = stack(s.keyword.font, s.fontTa);
      if (s.keyword.italic) st.fontStyle = "italic";
      if (s.keyword.grow) st.transform = "scale(1.18)";
    }
    if (s.effect === "wobble") st.transform = `${st.transform ?? ""} rotate(${j % 2 ? -4 : 3}deg)`;
    if (colors?.[j] && state !== "future") st.color = colors[j]!;
    return <span key={j} className="cw" style={st}>{words[j].w}</span>;
  };
  const join = (from: number, to: number) => words.slice(from, to).flatMap((_, k) => [k ? (brk.has(from + k - 1) ? <br key={`br${from + k}`} /> : " ") : null, word(from + k)]);

  let body: React.ReactNode;
  const stacked = s.effect === "stack" && s.stack;
  if (stacked) {
    const chunks = stackChunks(caseOf(s, text), sub ?? "", start, end);
    const k = Math.max(0, chunks.findIndex((c) => time < c.e)), [a, b, d] = chunks[k]?.parts ?? ["", "", ""];
    body = <>{a && <span className="stack-small">{a}</span>}<span key={k} className="stack-big" style={{ color: s.stack!.big, fontFamily: stack(s.stack!.font, s.fontTa), fontWeight: 400, fontSize: `${stackBig(b)}em` }}>{b}</span>{d && <span className="stack-small">{d}</span>}</>;
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
    <div className={`cap${s.effect ? ` fx-${s.effect}` : ""}`} style={{ "--p": p, ...wrap } as React.CSSProperties}>
      <span className="cap-main" style={base} data-text={s.effect === "vhs" ? breakLines(caseOf(s, text), s.lines) : undefined}>{body}</span>
      {sub && !stacked && <span className="cap-sub" style={{ fontFamily: stack(s.font, s.fontTa), letterSpacing: s.spacing ? `${s.spacing}em` : undefined }}>{sub}</span>}
    </div>
  );
}
