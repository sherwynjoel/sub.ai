"use client";
import { useEffect, useState } from "react";

// Sample dialogue (synthetic, labelled "Sample clip" in the window).
const CUES = [
  { t: "00:01:12,400", ta: "நீ சொன்னது உண்மையா?", en: "Was it true?" },
  { t: "00:01:15,050", ta: "சத்தியமா, பொய் இல்லை.", en: "I swear, it's not a lie." },
  { t: "00:01:18,900", ta: "சரி. நான் சொல்றேன்.", en: "Fine. I'll say it." },
];
const CLIPS = [18, 24, 14, 20, 16];

/** Hero: the Vasanam editor, tipped back in 3D; it straightens as you scroll (--p from <Effects>) and plays through Tamil + English cues. */
export default function HeroEditor() {
  const [i, setI] = useState(1);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % CUES.length), 2600);
    return () => clearInterval(t);
  }, []);

  const c = CUES[i];
  return (
    <div className="scene" data-scroll aria-hidden="true">
      <div className="editor">
        <div className="ebar"><span className="dots"><i /><i /><i /></span><span>interview_A.mov</span><span className="ebar-end">Tamil + English</span></div>
        <div className="ebody">
          <div className="video">
            <span className="tag">Sample clip</span>
            <div className="subtitle vsub" key={i}><span lang="ta">{c.ta}</span><small className="en">{c.en}</small></div>
          </div>
          <div className="cues">
            {CUES.map((x, n) => (
              <div key={x.t} className={`cue${n === i ? " on" : ""}`}>
                <span className="tc">{x.t}</span>
                <b lang="ta">{x.ta}</b>
                <span>{x.en}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="etrack">{CLIPS.map((w, n) => <i key={n} className={n === i ? "on" : undefined} style={{ width: `${w}%` }} />)}</div>
      </div>
    </div>
  );
}
