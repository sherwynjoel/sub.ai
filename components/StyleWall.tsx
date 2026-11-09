"use client";
import { useEffect, useRef, useState } from "react";
import StyledCaption from "@/components/StyledCaption";
import { STYLE_CHOICES, STYLE_GROUPS } from "@/lib/captionStyles";
import "@/app/caption-styles.css";

// Lines people really post, each with its English under it; the preview moves to the next one every few loops.
const LINES = [
  { text: "Machi, இந்த edit semma!", sub: "Dude, this edit is awesome!" },
  { text: "மறக்காம page-அ follow பண்ணுங்க", sub: "Don't forget to follow the page" },
  { text: "Bro, இது next level!", sub: "Bro, this is next level!" },
];
const START = 0.1, END = 2.6, LOOP = 4.2;

/**
 * The homepage's style picker: a phone playing one caption in the picked style, and every style by name to tap,
 * the popular ones first. The clock only runs while it's on screen.
 */
export default function StyleWall({ popular }: { popular: string[] }) {
  const first = popular.find((id) => STYLE_CHOICES.some((s) => s.id === id)) ?? STYLE_CHOICES[0].id;
  const [id, setId] = useState(first);
  const [t, setT] = useState(END - 0.01);
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0, t0 = 0;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (!e.isIntersecting) return;
      t0 = performance.now();
      timer = window.setInterval(() => {
        const s = (performance.now() - t0) / 1000;
        setT(s % LOOP);
        setN(Math.floor(s / (LOOP * 2)) % LINES.length);
      }, 50);
    });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); clearInterval(timer); };
  }, []);

  const style = STYLE_CHOICES.find((s) => s.id === id) ?? STYLE_CHOICES[0];
  const top = popular.filter((p) => STYLE_CHOICES.some((s) => s.id === p));
  const line = LINES[n];

  return (
    <div className="sw" ref={ref}>
      <figure className="sw-phone" aria-label={`${style.name}: a preview of the style`}>
        <div className="sw-screen">
          <span className="sw-time" aria-hidden="true">00:00:0{Math.min(9, Math.floor(t))}</span>
          <div className="sw-stage" aria-hidden="true">
            <StyledCaption key={`${id}-${n}`} styleId={id} text={line.text} sub={line.sub} start={START} end={END} time={Math.min(t, END - 0.01)} ratio={9 / 16} />
          </div>
        </div>
        <figcaption><b>{style.name}</b><span>{style.group}</span></figcaption>
      </figure>

      <div className="sw-pick">
        <p className="sw-hint">Tap a name to see it.</p>
        <div className="sw-group">
          <h3>Popular</h3>
          <ul>
            {top.map((p) => <li key={p}><button type="button" aria-pressed={p === id} onClick={() => setId(p)}>{STYLE_CHOICES.find((s) => s.id === p)?.name}</button></li>)}
          </ul>
        </div>
        {STYLE_GROUPS.map((g) => {
          const list = STYLE_CHOICES.filter((s) => s.group === g && !top.includes(s.id));
          return list.length > 0 && (
            <div className="sw-group" key={g}>
              <h3>{g}</h3>
              <ul>
                {list.map((s) => <li key={s.id}><button type="button" aria-pressed={s.id === id} onClick={() => setId(s.id)}>{s.name}</button></li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
