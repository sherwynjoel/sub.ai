"use client";
import { useEffect, useState } from "react";

// Sample dialogue (synthetic, labelled on the board as a sample clip).
const CUES = [
  { t: 0.6, ta: "இன்னைக்கு ஷூட் எத்தனை மணிக்கு?", en: "What time is the shoot today?" },
  { t: 4.2, ta: "லைட் இன்னும் கொஞ்சம் கம்மி பண்ணுங்க.", en: "Bring the light down a little." },
  { t: 7.8, ta: "இந்த சீன் ஒரே டேக்ல முடிச்சிடலாம்.", en: "Let's finish this scene in one take." },
  { t: 11.4, ta: "எல்லாரும் ரெடியா? ஆக்ஷன்!", en: "Everyone ready? Action!" },
];
const LEN = 15;
const CUE = 3.2;
// A fixed, speech-shaped waveform: louder inside cues, near-silent between them.
const BARS = Array.from({ length: 96 }, (_, i) => {
  const t = (i / 96) * LEN;
  const speaking = CUES.some((c) => t >= c.t && t < c.t + CUE);
  const n = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  return speaking ? 0.35 + n * 0.65 : 0.06 + n * 0.1;
});
const tc = (s: number) => `00:00:${String(Math.floor(s)).padStart(2, "0")}:${String(Math.floor((s % 1) * 25)).padStart(2, "0")}`;

/** The hero's screen board: the clip's dialogue paints on as subtitles while the playhead runs over the waveform. */
export default function ScreenBoard() {
  const [time, setTime] = useState(CUES[1].t + 1.5);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setTime(((now - t0) / 1000 + CUES[0].t - 0.3) % LEN);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const active = CUES.find((c) => time >= c.t && time < c.t + CUE);

  return (
    <div className="screen-board" aria-hidden="true">
      <div className="screen-face">
        <span className="screen-tc tc">{tc(time)}</span>
        <div className="screen-cue subtitle" key={active?.t ?? "gap"}>
          {active && (
            <>
              <span className="paint" lang="ta">{active.ta}</span>
              <span className="paint en">{active.en}</span>
            </>
          )}
        </div>
        <div className="wave">
          {BARS.map((h, i) => <i key={i} style={{ height: `${Math.round(h * 100)}%` }} />)}
          {CUES.map((c) => (
            <span key={c.t} className={`wave-cue${active === c ? " on" : ""}`} style={{ left: `${(c.t / LEN) * 100}%`, width: `${(CUE / LEN) * 100}%` }} />
          ))}
          <span className="playhead" style={{ left: `${(time / LEN) * 100}%` }} />
        </div>
      </div>
      <div className="strip">
        <span>Sample clip</span>
        <span className="tc">{tc(time)}</span>
        <span>Tamil + English</span>
      </div>
    </div>
  );
}
