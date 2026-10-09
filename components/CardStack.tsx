"use client";
import { useEffect, useState } from "react";

// Sample dialogue (synthetic, labelled on the stack as a sample).
const CUES = [
  { t: "00:01:12,400", ta: "நீ சொன்னது எல்லாம் உண்மைதானா?", en: "Was everything you said true?" },
  { t: "00:01:15,050", ta: "சத்தியமா, ஒரு வார்த்தை கூட பொய் இல்லை.", en: "I swear, not a single word was a lie." },
  { t: "00:01:18,900", ta: "சரி. நான் சொல்றேன்.", en: "Fine. I'll say it." },
];
const N = CUES.length;

/** Hero: the playing subtitle leaves toward the viewer while the next one rises from behind. */
export default function CardStack() {
  const [front, setFront] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let off: ReturnType<typeof setTimeout>;
    const t = setInterval(() => {
      setFront((f) => {
        setLeaving(f);
        off = setTimeout(() => setLeaving(null), 650);
        return (f + 1) % N;
      });
    }, 3000);
    return () => { clearInterval(t); clearTimeout(off); };
  }, []);

  return (
    <div className="stack-wrap" aria-hidden="true">
      <span className="shape circle" />
      <span className="shape square" />
      <div className="stack">
        {CUES.map((c, i) => {
          const depth = (i - front + N) % N;
          return (
            <div key={c.t} className={`cue-card ${leaving === i ? "out" : `d${depth}`}`}>
              <span className="cue-tc tc">{c.t}</span>
              <span className="cue-ta" lang="ta">{c.ta}</span>
              <span className="cue-en">{c.en}</span>
              <span className="cue-bar"><i key={depth === 0 ? front : -1} /></span>
            </div>
          );
        })}
      </div>
      <span className="stack-tag">Sample subtitles</span>
    </div>
  );
}
