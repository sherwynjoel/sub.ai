"use client";
import { useEffect, useRef, useState } from "react";
import StyledCaption from "@/components/StyledCaption";
import { CAPTION_STYLES, STYLE_CHOICES, STYLE_GROUPS, styleOf } from "@/lib/captionStyles";

/** How long one preview plays (the caption from START to END), then a beat to see it settled, then again. */
const START = 0.25, END = 2.75, LOOP = 3.6;
const FALLBACK = "This is how your captions look";
/** The styles shown first, the rest behind "See all styles". */
export const POPULAR = ["cc-light-sweep", "cc-bold-dot", "cc-rise", "cc-text-reveal", "cc-flash-box", "cc-cinematic", "tpl-reels-glow", "tall-caps"];

/** A preview's few words: the caption's first ones (a preview chip holds about six). */
const head = (text: string, n = 6) => text.trim().split(/\s+/).slice(0, n).join(" ");

/**
 * The cards' glow from a still: shrunk to a few pixels, saturated, fading out to its edges and over anything grey (black
 * bars), so stretched over a card it's already a soft wash of the video's colours. (A live blur on every card ran at a
 * third of the frame rate with all the styles open.)
 */
function wash(still: string, done: (url: string) => void) {
  const N = 16, img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = N;
    const g = c.getContext("2d");
    if (!g) return;
    g.drawImage(img, 0, 0, N, N);
    const px = g.getImageData(0, 0, N, N), d = px.data;
    for (let i = 0; i < d.length; i += 4) {
      const grey = (d[i] + d[i + 1] + d[i + 2]) / 3, chroma = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      const x = (i / 4) % N + 0.5 - N / 2, y = Math.floor(i / 4 / N) + 0.5 - N / 2;
      for (let k = 0; k < 3; k++) d[i + k] = grey + (d[i + k] - grey) * 5; // the array clamps to 0-255
      d[i + 3] = 255 * Math.min(1, chroma / 30) * Math.max(0, 1 - Math.hypot(x, y) / (N / 2 - 1));
    }
    g.putImageData(px, 0, 0);
    done(c.toDataURL());
  };
  img.src = still;
}

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
  const [glow, setGlow] = useState<string>();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { // taken once, when the picker opens (the video may still be loading: then the plain background)
    const still = frame?.();
    if (still) { requestAnimationFrame(() => setBg(still)); wash(still, setGlow); }
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

  useEffect(() => { // the cards' glow leans towards the pointer: where it is from each card's centre, in half-cards
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0, x = 0, y = 0;
    const paint = () => {
      id = 0;
      const chips = [...(ref.current?.querySelectorAll<HTMLElement>(".style-chip") ?? [])];
      const boxes = chips.map((c) => c.getBoundingClientRect()); // all the reads, then all the writes
      chips.forEach((c, i) => {
        const b = boxes[i];
        c.style.setProperty("--pointer-x", ((x - b.left - b.width / 2) / (b.width / 2)).toFixed(3));
        c.style.setProperty("--pointer-y", ((y - b.top - b.height / 2) / (b.height / 2)).toFixed(3));
      });
    };
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; id ||= requestAnimationFrame(paint); };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", move, { passive: true }); // a tap, on a phone
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", move);
      cancelAnimationFrame(id);
    };
  }, []);

  const text = line?.trim() ? head(line) : FALLBACK;
  // the popular few first; every style behind "See all styles" (open already when the chosen one isn't popular)
  const [all, setAll] = useState(false);
  const showAll = all || !POPULAR.includes(styleId);
  const groups = showAll ? STYLE_GROUPS.concat(STYLE_GROUPS.includes(styleOf(styleId).group) ? [] : [styleOf(styleId).group]) : [];
  const chip = (x: (typeof CAPTION_STYLES)[number]) => (
    <button key={x.id} role="radio" aria-checked={styleId === x.id} className="style-chip" title={x.blurb}
      onClick={() => onPick(x.id)} onMouseEnter={() => onHover?.(x.id)} onFocus={() => onHover?.(x.id)} onBlur={() => onHover?.(null)}>
      <span className="style-glow" aria-hidden="true" />
      <span className="style-ring" aria-hidden="true" />
      <span className="style-sample" aria-hidden="true">
        <StyledCaption styleId={x.id} text={text} start={START} end={END} time={Math.min(t, END - 0.01)} />
      </span>
      <span className="style-name">{x.name}</span>
    </button>
  );
  return (
    <div ref={ref} onMouseLeave={() => onHover?.(null)} style={bg ? { "--sample-bg": `url(${bg})`, "--glow-bg": glow && `url(${glow})` } as React.CSSProperties : undefined}>
      <div className="style-group">
        <span className="muted small">Popular</span>
        <div className="style-grid" role="radiogroup" aria-label="Popular styles">{POPULAR.map((id) => chip(styleOf(id)))}</div>
      </div>
      {!showAll && <button type="button" className="btn ghost small style-all" onClick={() => setAll(true)}>See all {STYLE_CHOICES.length} styles</button>}
      {groups.map((g) => (
        <div key={g} className="style-group">
          <span className="muted small">{g}</span>
          <div className="style-grid" role="radiogroup" aria-label={`${g} styles`}>
            {/* The styles on offer, plus this project's own if it's one no longer offered (so it still shows as picked). */}
            {CAPTION_STYLES.filter((x) => x.group === g && (STYLE_CHOICES.includes(x) || x.id === styleId)).map(chip)}
          </div>
        </div>
      ))}
    </div>
  );
}
