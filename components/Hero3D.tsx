"use client";
import { useEffect, useRef, useState } from "react";

const LINES = [
  { t: 1.2, ta: "இன்னைக்கு ஷூட் எத்தனை மணிக்கு?", en: "What time is the shoot today?" },
  { t: 4.6, ta: "லைட் இன்னும் கொஞ்சம் கம்மி பண்ணுங்க.", en: "Bring the light down a little." },
  { t: 8.1, ta: "இந்த சீன் ஒரே டேக்ல முடிச்சிடலாம்.", en: "Let's finish this scene in one take." },
  { t: 11.9, ta: "எல்லாரும் ரெடியா? ஆக்ஷன்!", en: "Everyone ready? Action!" },
];
const CHIPS = ["வணக்கம்", ".SRT", "Action!", "தமிழ்", "00:01:12,400", "English", ".VTT", "சூப்பர்", "Premiere Pro", "After Effects"];
const LEN = 15;
const CUE = 3.1;
const tc = (s: number) => `00:00:${String(Math.floor(s)).padStart(2, "0")}:${String(Math.floor((s % 1) * 24)).padStart(2, "0")}`;

/** 3D hero: a glass screen speaking in subtitles, a ring of chips orbiting it, cues landing on a timeline. Tilts with pointer and scroll. */
export default function Hero3D() {
  const stage = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(LINES[2].t + 0.5);

  useEffect(() => {
    const el = stage.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setTime(((now - t0) / 1000) % LEN);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = (e: PointerEvent) => {
      el.style.setProperty("--px", String(e.clientX / innerWidth - 0.5));
      el.style.setProperty("--py", String(e.clientY / innerHeight - 0.5));
    };
    const scroll = () => el.style.setProperty("--sp", String(Math.min(1, scrollY / innerHeight)));
    addEventListener("pointermove", move, { passive: true });
    addEventListener("scroll", scroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      removeEventListener("scroll", scroll);
    };
  }, []);

  const active = LINES.findLast((l) => time >= l.t && time < l.t + CUE);

  return (
    <div className="stage" ref={stage} aria-hidden="true">
      <div className="rig">
        <div className="ring">
          {CHIPS.map((c, i) => (
            <span key={c} className="chip" style={{ "--a": `${(360 / CHIPS.length) * i}deg` } as React.CSSProperties} lang={/[\u0B80-\u0BFF]/.test(c) ? "ta" : undefined}>{c}</span>
          ))}
        </div>
        <div className="screen">
          <div className="scene" />
          <div className="rec"><i />REC</div>
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
