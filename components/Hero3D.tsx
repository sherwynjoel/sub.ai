"use client";
import { useEffect, useRef, useState } from "react";

const LINES = [
  { t: 1.2, ta: "இன்னைக்கு ஷூட் எத்தனை மணிக்கு?", en: "What time is the shoot today?" },
  { t: 4.6, ta: "லைட் இன்னும் கொஞ்சம் கம்மி பண்ணுங்க.", en: "Bring the light down a little." },
  { t: 8.1, ta: "இந்த சீன் ஒரே டேக்ல முடிச்சிடலாம்.", en: "Let's finish this scene in one take." },
  { t: 11.9, ta: "எல்லாரும் ரெடியா? ஆக்ஷன்!", en: "Everyone ready? Action!" },
];
const LEN = 15;
const CUE = 3.1;
const tc = (s: number) => `00:00:${String(Math.floor(s)).padStart(2, "0")}:${String(Math.floor((s % 1) * 24)).padStart(2, "0")}`;

/** The one orchestrated moment: a tilted screen speaking in subtitles, cues landing on a timeline beneath it. */
export default function Hero3D() {
  const stage = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(LINES[2].t + 0.5);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setTime(((now - t0) / 1000) % LEN);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
      el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const active = LINES.findLast((l) => time >= l.t && time < l.t + CUE);

  return (
    <div className="stage" ref={stage} aria-hidden="true">
      <div className="rig">
        <div className="screen">
          <div className="scene" />
          <div className="tc">{tc(time)}</div>
          {active && (
            <div className="subtitle on-screen" key={active.t}>
              <div lang="ta">{active.ta}</div>
              <div className="en">{active.en}</div>
            </div>
          )}
        </div>
        <div className="track">
          {LINES.map((l) => (
            <div
              key={l.t}
              className={`cue${time >= l.t ? " landed" : ""}${active === l ? " live" : ""}`}
              style={{ left: `${(l.t / LEN) * 100}%`, width: `${(CUE / LEN) * 100}%` }}
            >
              {l.en}
            </div>
          ))}
          <div className="playhead" style={{ left: `${(time / LEN) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
