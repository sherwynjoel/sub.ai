"use client";
import { useEffect, useRef, useState } from "react";
import { CLIP, type ClipCue } from "@/lib/vsClip";

/**
 * The home page's "Why Vasanamm" pair: the same clip plays muted in both cards, in step, with the usual
 * auto-captions on one (English words forced into Tamil letters, no English) and Vasanamm's real subtitles on the
 * other. Plays only while on screen; with reduced motion it stays on the first line.
 */
export default function ClipCompare() {
  const lead = useRef<HTMLVideoElement>(null), follow = useRef<HTMLVideoElement>(null), box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(CLIP.cues[0]?.start ?? 0);

  useEffect(() => {
    const a = lead.current, b = follow.current, el = box.current;
    if (!a || !b || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      setT(a.currentTime);
      if (Math.abs(b.currentTime - a.currentTime) > 0.12) b.currentTime = a.currentTime; // keep the two in step
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        b.currentTime = a.currentTime;
        Promise.all([a.play(), b.play()]).catch(() => {});
        raf = requestAnimationFrame(tick);
      } else {
        a.pause(); b.pause(); cancelAnimationFrame(raf);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const cue: ClipCue | undefined = CLIP.cues.find((c) => t >= c.start && t < c.end);
  const video = (ref: React.RefObject<HTMLVideoElement | null>) => (
    <video ref={ref} className="hm-clip" src={CLIP.src} poster={CLIP.poster} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
  );

  return (
    <div className="hm-vs" ref={box}>
      <figure className="hm-frame bad rise">
        {video(lead)}
        <span className="hm-frame-tag">Usual auto-captions</span>
        <p className="hm-cap" lang="ta" aria-live="off">{cue ? <Marked text={cue.bad} /> : " "}</p>
        <figcaption>English words forced into Tamil letters. No English line.</figcaption>
      </figure>
      <figure className="hm-frame good rise" style={{ "--d": "0.08s" } as React.CSSProperties}>
        {video(follow)}
        <span className="hm-frame-tag">Vasanamm</span>
        <p className="hm-cap" aria-live="off">{cue ? <>{cue.good}<small>{cue.en}</small></> : " "}</p>
        <figcaption>Tamil words in Tamil, English words in English, a translation under it.</figcaption>
      </figure>
    </div>
  );
}

/** Words wrapped in [square brackets] are the forced ones: underlined in red. */
function Marked({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\])/).map((p, i) => (p.startsWith("[") ? <span key={i} className="sq">{p.slice(1, -1)}</span> : p))}</>;
}
