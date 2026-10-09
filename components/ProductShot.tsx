"use client";
import { useEffect, useState } from "react";

// Sample dialogue (synthetic; the video pane is labelled "Sample clip").
const CUES = [
  { t: 0.6, ta: "இன்னைக்கு ஷூட் எத்தனை மணிக்கு?", en: "What time is the shoot today?" },
  { t: 4.2, ta: "லைட் இன்னும் கொஞ்சம் கம்மி பண்ணுங்க.", en: "Bring the light down a little." },
  { t: 7.8, ta: "இந்த சீன் ஒரே டேக்ல முடிச்சிடலாம்.", en: "Let's finish this scene in one take." },
  { t: 11.4, ta: "எல்லாரும் ரெடியா? ஆக்ஷன்!", en: "Everyone ready? Action!" },
];
const LEN = 15;
const CUE = 3.2;
const BARS = Array.from({ length: 120 }, (_, i) => {
  const t = (i / 120) * LEN;
  const speaking = CUES.some((c) => t >= c.t && t < c.t + CUE);
  const n = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  return Math.round((speaking ? 0.3 + n * 0.7 : 0.05 + n * 0.08) * 100);
});
const tc = (s: number) => `00:00:${String(Math.floor(s)).padStart(2, "0")}:${String(Math.floor((s % 1) * 25)).padStart(2, "0")}`;
const srt = (s: number) => `00:00:${String(Math.floor(s)).padStart(2, "0")},${String(Math.round((s % 1) * 1000)).padStart(3, "0")}`;

/** The hero: the Vasanam editor at work — video with subtitles, the bilingual cue list, and the timeline. */
export default function ProductShot() {
  const [time, setTime] = useState(CUES[1].t + 1.2);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setTime(((now - t0) / 1000 + CUES[1].t + 1.2) % LEN);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const active = CUES.find((c) => time >= c.t && time < c.t + CUE);

  return (
    <div className="shot" aria-hidden="true">
      <div className="shot-bar">
        <span className="dots"><i /><i /><i /></span>
        <span className="shot-title">interview_A_cam.mov</span>
        <span className="shot-export">Export SRT</span>
      </div>
      <div className="shot-body">
        <div className="shot-video">
          <div className="shot-frame">
            <span className="shot-tag">Sample clip</span>
            <div className="shot-sub subtitle" key={active?.t ?? "gap"}>
              {active && (
                <>
                  <span className="fade-in" lang="ta">{active.ta}</span>
                  <span className="fade-in en">{active.en}</span>
                </>
              )}
            </div>
          </div>
          <div className="shot-transport">
            <span className="play" />
            <span className="tc">{tc(time)}</span>
            <span className="seg-mini"><b>தமிழ்</b><b>English</b><b className="on">Both</b></span>
          </div>
        </div>
        <ol className="shot-cues">
          {CUES.map((c) => (
            <li key={c.t} className={active === c ? "on" : undefined}>
              <span className="tc">{srt(c.t)} → {srt(c.t + CUE)}</span>
              <span lang="ta">{c.ta}</span>
              <span className="en">{c.en}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="shot-timeline">
        <div className="lane">
          {CUES.map((c) => (
            <span key={c.t} className={`clip${active === c ? " on" : ""}`} style={{ left: `${(c.t / LEN) * 100}%`, width: `${(CUE / LEN) * 100}%` }}>
              {c.en}
            </span>
          ))}
        </div>
        <div className="wave">{BARS.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
        <span className="playhead" style={{ left: `${(time / LEN) * 100}%` }} />
      </div>
    </div>
  );
}
