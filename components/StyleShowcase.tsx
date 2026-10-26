"use client";
import { useEffect, useRef, useState } from "react";
import StyledCaption from "@/components/StyledCaption";
import { STYLE_CHOICES, STYLE_GROUPS } from "@/lib/captionStyles";
import "@/app/caption-styles.css";

const LINE = { text: "இந்த song தான் என் favourite", start: 0.3, end: 2.7, loop: 3.6 };
const GROUPS = ["All", ...STYLE_GROUPS] as const;
/** The three shown first; "See more" opens the rest. */
const FEATURED = ["trending-1", "trending-2", "trending-3"];

/** Every caption style playing the same line on a loop; the clock only runs while the grid is on screen. */
export default function StyleShowcase() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("All");
  const [t, setT] = useState(LINE.end);
  const [all, setAll] = useState(false); // the three featured styles until "See more"
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0, t0 = 0;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(id);
      if (!e.isIntersecting) return;
      t0 = performance.now();
      id = window.setInterval(() => setT(((performance.now() - t0) / 1000) % LINE.loop), 60);
    });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); clearInterval(id); };
  }, []);

  const shown = all
    ? STYLE_CHOICES.filter((s) => group === "All" || s.group === group)
    : FEATURED.map((id) => STYLE_CHOICES.find((s) => s.id === id)).filter((s) => s !== undefined);
  return (
    <div ref={ref}>
      {all && <div className="style-tabs" role="tablist" aria-label="Style groups">
        {GROUPS.map((g) => (
          <button key={g} role="tab" aria-selected={group === g} onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>}
      <div className={`style-cards${all ? " all" : ""}`} id="style-cards">
        {shown.map((s) => (
          <article key={s.id} className="style-card glass shine">
            <div className="style-stage" aria-hidden="true" style={{ "--s": s.size ?? 1 } as React.CSSProperties}>
              <StyledCaption styleId={s.id} text={LINE.text} start={LINE.start} end={LINE.end} time={Math.min(t, LINE.end - 0.01)} />
            </div>
            <div className="style-meta">
              <h3>{s.name}</h3>
              <span className="style-group-tag">{s.group}</span>
            </div>
            <p>{s.blurb}</p>
          </article>
        ))}
      </div>
      <button className="btn ghost style-more" aria-expanded={all} aria-controls="style-cards"
        onClick={() => { setAll(!all); setGroup("All"); }}>
        {all ? "Show fewer" : "See more styles"}
      </button>
    </div>
  );
}
