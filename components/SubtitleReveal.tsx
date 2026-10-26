"use client";
import { useEffect, useState } from "react";

const TIPS = [
  "Drag a caption on the video to move it. It snaps to the middle.",
  "Drag the dot on a caption's corner to make it bigger or smaller.",
  "\"Change type\" switches between Tamil, Tanglish and English without using minutes.",
  "Check timing jumps to any caption that may be off.",
  "Download an SRT for Premiere, Resolve or YouTube, or a styled MP4.",
  "Pick a safe zone so captions stay clear of Instagram and YouTube buttons.",
];

/**
 * While a video is being subtitled: the video's own frame comes into focus from the top as the work progresses,
 * under a shimmering line saying what's happening, with a tip every few seconds. The real progress arrives in
 * steps (every 3 s, per chunk), so the shown progress creeps ahead a little between them and never stands still.
 */
export default function SubtitleReveal({ src, progress, queued }: { src?: string; progress: number; queued: boolean }) {
  const [shown, setShown] = useState(queued ? 0 : progress);
  const [tip, setTip] = useState(0);
  const [frame, setFrame] = useState<"loading" | "ok" | "none">(src ? "loading" : "none");

  useEffect(() => {
    if (queued) return;
    const t = setInterval(() => setShown((s) => {
      const cap = Math.min(97, progress + 12); // never far ahead of the real work
      return s < progress ? progress : s + Math.max(0.02, (cap - s) * 0.015);
    }), 100);
    return () => clearInterval(t);
  }, [progress, queued]);
  useEffect(() => {
    const t = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const p = Math.min(100, shown);
  const stage = queued ? "Getting started…" : p < 25 ? "Listening to your video…" : p < 85 ? "Writing your subtitles…" : "Timing every word…";
  const edge = `linear-gradient(to bottom, transparent ${p - 6}%, #000 ${p + 4}%)`;
  return (
    <div className="reveal">
      <p className="reveal-stage" aria-live="polite">{stage}</p>
      <div className="reveal-card">
        {frame !== "none" ? (
          // #t=1: a frame from one second in, which is rarely black
          <video className="reveal-frame" src={`${src}#t=1`} muted playsInline preload="metadata" aria-hidden="true"
            onLoadedData={(e) => setFrame(e.currentTarget.videoWidth ? "ok" : "none")} onError={() => setFrame("none")} />
        ) : <div className="reveal-frame reveal-plain" aria-hidden="true" />}
        {/* A blurred copy on top, faded out above the line (a backdrop blur doesn't work inside the glass panels). */}
        {frame !== "none"
          ? <video className="reveal-frame reveal-blur" src={`${src}#t=1`} muted playsInline preload="metadata" aria-hidden="true" style={{ maskImage: edge, WebkitMaskImage: edge }} />
          : <div className="reveal-frame reveal-plain reveal-blur" aria-hidden="true" style={{ maskImage: edge, WebkitMaskImage: edge }} />}
        <div className="reveal-line" style={{ top: `${p}%` }} />
      </div>
      <p className="reveal-tip muted" key={tip}><strong>Tip:</strong> {TIPS[tip]}</p>
    </div>
  );
}
