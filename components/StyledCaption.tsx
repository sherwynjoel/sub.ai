"use client";
import { caseOf, keywordIndex, resolveStyle, wordTimes, type CaptionCustom } from "@/lib/captionStyles";

type Props = { styleId: string; custom?: CaptionCustom; text: string; sub?: string; start: number; end: number; time: number };

const stack = (font: string) => `"${font}", var(--font-tamil), "Nirmala UI", "Noto Sans", sans-serif`;

/**
 * A caption line drawn in a caption style at a moment in time. Mirrors buildAss() in lib/captionStyles.ts
 * so the editor preview matches the burned-in MP4. Sized in container units: the parent needs container-type: size.
 */
export default function StyledCaption({ styleId, custom, text, sub, start, end, time }: Props) {
  const s = resolveStyle(styleId, custom);
  const words = wordTimes(caseOf(s, text), start, end);
  const kw = keywordIndex(words.map((w) => w.w));
  let i = words.findIndex((w) => time < w.e);
  if (i < 0) i = words.length - 1;
  const p = Math.min(1, Math.max(0, (time - start) / Math.max(0.01, end - start)));

  const base: React.CSSProperties = {
    fontFamily: stack(s.font), fontSize: `calc(${s.size ?? 1} * 7.5cqmin)`, fontWeight: s.bold ? 700 : 400, fontStyle: s.italic ? "italic" : undefined,
    color: s.color,
    textShadow: s.shadow ? `0 ${s.shadow}em ${s.shadow * 2}em rgba(0,0,0,.6)` : undefined,
    WebkitTextStroke: s.outline ? `${s.outline[1] * 2}em ${s.outline[0]}` : undefined,
    background: s.box, padding: s.box ? ".18em .45em" : undefined, borderRadius: s.box ? ".25em" : undefined,
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
    }
    if (j === kw && s.keyword && state !== "future") {
      if (s.keyword.color) st.color = s.keyword.color;
      if (s.keyword.font) st.fontFamily = stack(s.keyword.font);
      if (s.keyword.italic) st.fontStyle = "italic";
      if (s.keyword.grow) st.transform = "scale(1.18)";
    }
    if (s.effect === "wobble") st.transform = `${st.transform ?? ""} rotate(${j % 2 ? -4 : 3}deg)`;
    return <span key={j} className="cw" style={st}>{words[j].w}</span>;
  };
  const join = (from: number, to: number) => words.slice(from, to).flatMap((_, k) => [k ? " " : null, word(from + k)]);

  let body: React.ReactNode;
  if (s.effect === "typewriter") {
    const chars = [...caseOf(s, text)];
    body = <>{chars.slice(0, Math.max(1, Math.ceil(chars.length * Math.min(1, p / 0.8)))).join("")}<span className="caret">_</span></>;
  } else if (s.effect === "solo") {
    body = <>{i > 0 && <span className="solo-prev">{words[i - 1].w}</span>}<span key={i} className="solo-now">{words[i].w}</span></>;
  } else if (s.effect === "punch" && words.length > 2) {
    const cut = words.length - Math.min(2, words.length - 1);
    body = <><span className="punch-a">{join(0, cut)}</span><span className="punch-b">{join(cut, words.length)}</span></>;
  } else if (s.effect === "vhs" || s.effect === "crawl") {
    body = caseOf(s, text);
  } else {
    body = join(0, words.length);
  }

  return (
    <div className={`cap${s.effect ? ` fx-${s.effect}` : ""}`} style={{ "--p": p } as React.CSSProperties}>
      <span className="cap-main" style={base} data-text={s.effect === "vhs" ? caseOf(s, text) : undefined}>{body}</span>
      {sub && <span className="cap-sub">{sub}</span>}
    </div>
  );
}
