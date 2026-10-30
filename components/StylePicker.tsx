"use client";
import { useEffect, useRef, useState } from "react";
import StyledCaption from "@/components/StyledCaption";
import { CAPTION_STYLES, STYLE_CHOICES, STYLE_GROUPS, styleOf } from "@/lib/captionStyles";

/** How long one preview plays (the caption from START to END), then a beat to see it settled, then again. */
const START = 0.25, END = 2.75, LOOP = 3.6;
const FALLBACK = "This is how your captions look";

/** A preview's few words: the caption's first ones (a preview chip holds about six). */
const head = (text: string, n = 6) => text.trim().split(/\s+/).slice(0, n).join(" ");

/**
 * The styles on offer, each playing its own animation on the user's caption, so a style can be judged before it's
 * picked. One clock for all of them, running only while they're on screen (and not for reduced motion). Hovering
 * one (desktop) previews it on the video too.
 */
export default function StylePicker({ styleId, onPick, onHover, text: line, frame }: {
  styleId: string;
  onPick: (id: string) => void;
  onHover?: (id: string | null) => void;
  text?: string;                     // the selected caption, in English
  frame?: () => string | undefined;  // a still of the video, behind the previews
}) {
  const [t, setT] = useState(END);
  const [bg, setBg] = useState<string>();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { // taken once, when the picker opens (the video may still be loading: then the plain background)
    const still = frame?.();
    if (still) requestAnimationFrame(() => setBg(still));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(id);
      if (!e.isIntersecting) return;
      const t0 = performance.now();
      id = window.setInterval(() => setT(((performance.now() - t0) / 1000) % LOOP), 60);
    });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); clearInterval(id); };
  }, []);

  const text = line?.trim() ? head(line) : FALLBACK;
  const groups = STYLE_GROUPS.concat(STYLE_GROUPS.includes(styleOf(styleId).group) ? [] : [styleOf(styleId).group]);
  return (
    <div ref={ref} onMouseLeave={() => onHover?.(null)} style={bg ? { "--sample-bg": `url(${bg})` } as React.CSSProperties : undefined}>
      {groups.map((g) => (
        <div key={g} className="style-group">
          <span className="muted small">{g}</span>
          <div className="style-grid" role="radiogroup" aria-label={`${g} styles`}>
            {/* The styles on offer, plus this project's own if it's one no longer offered (so it still shows as picked). */}
            {CAPTION_STYLES.filter((x) => x.group === g && (STYLE_CHOICES.includes(x) || x.id === styleId)).map((x) => (
              <button key={x.id} role="radio" aria-checked={styleId === x.id} className="style-chip" title={x.blurb}
                onClick={() => onPick(x.id)} onMouseEnter={() => onHover?.(x.id)} onFocus={() => onHover?.(x.id)} onBlur={() => onHover?.(null)}>
                <span className="style-sample" aria-hidden="true">
                  <StyledCaption styleId={x.id} text={text} start={START} end={END} time={Math.min(t, END - 0.01)} />
                </span>
                <span className="style-name">{x.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
