"use client";
import { useEffect, useState } from "react";

const CUES = [
  { t: "00:01:12,400", ta: "நீ சொன்னது எல்லாம் உண்மைதானா?", en: "Was everything you said true?" },
  { t: "00:01:15,050", ta: "சத்தியமா, ஒரு வார்த்தை கூட பொய் இல்லை.", en: "I swear, not a single word was a lie." },
  { t: "00:01:18,900", ta: "அப்போ நாளைக்கு எல்லார் முன்னாடியும் சொல்லு.", en: "Then say it tomorrow, in front of everyone." },
  { t: "00:01:22,300", ta: "சரி. நான் சொல்றேன்.", en: "Fine. I'll say it." },
];
type View = "ta" | "en" | "both";

/** Same timing, two languages: flip the view, watch the playing line move down the cue list. */
export default function LanguageDemo() {
  const [view, setView] = useState<View>("both");
  const [i, setI] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % CUES.length), 2800);
    return () => clearInterval(t);
  }, []);

  const c = CUES[i];
  return (
    <div className="demo">
      <div className="demo-screen tilt">
        <div className="scene" />
        <div className="subtitle on-screen" key={`${i}${view}`}>
          {view !== "en" && <div lang="ta">{c.ta}</div>}
          {view !== "ta" && <div className="en">{c.en}</div>}
        </div>
      </div>
      <div className="demo-side">
        <div className="seg" role="group" aria-label="Subtitle language">
          {(["ta", "en", "both"] as View[]).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "ta" ? "தமிழ்" : v === "en" ? "English" : "Both"}</button>
          ))}
        </div>
        <ol className="demo-cues">
          {CUES.map((x, n) => (
            <li key={x.t} className={n === i ? "on" : undefined}>
              <span className="time">{x.t}</span>
              {view !== "en" && <span lang="ta">{x.ta}</span>}
              {view !== "ta" && <span className="muted">{x.en}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
