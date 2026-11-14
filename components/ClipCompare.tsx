"use client";
import { useEffect, useRef, useState } from "react";
import { CLIP, type ClipCue } from "@/lib/vsClip";
import { useNear } from "@/lib/useNear";

/**
 * The home page's "Why Vasanamm" pair, playing muted and in step: the plain clip with the usual auto-captions on
 * the left (English words forced into Tamil letters, no English), and the same clip as exported from Vasanamm on the
 * right (its captions are in the video). Plays only while on screen; with reduced motion it stays still.
 */
export default function ClipCompare() {
  const lead = useRef<HTMLVideoElement>(null), follow = useRef<HTMLVideoElement>(null), box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(CLIP.cues[0]?.start ?? 0);
  const near = useNear(box); // nothing is fetched until the section is close

  useEffect(() => {
    const a = lead.current, b = follow.current, el = box.current;
    if (!a || !b || !el || !near) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, seen = false, lastSeek = 0;
    const stalled = new Set<HTMLVideoElement>();
    // Both play only when both have enough to play: if one runs out (still downloading), the other waits for it.
    const go = () => { if (seen && !stalled.size && a.readyState >= 3 && b.readyState >= 3) { a.play().catch(() => {}); b.play().catch(() => {}); } };
    const wait = (v: HTMLVideoElement) => () => { stalled.add(v); (v === a ? b : a).pause(); };
    const ready = (v: HTMLVideoElement) => () => { stalled.delete(v); go(); };
    const tick = () => {
      setT(a.currentTime);
      // Kept in step gently: a small gap is closed by running the right one a little faster or slower; only a big
      // gap (over 0.6 s) jumps it, at most every 3 s. (Jumping at every small gap made it download again and buffer.)
      const dur = a.duration || 0;
      let d = b.currentTime - a.currentTime;
      if (dur) d = ((d + dur * 1.5) % dur) - dur / 2; // across the loop's end
      const now = performance.now();
      if (Math.abs(d) > 0.6 && now - lastSeek > 3000) { lastSeek = now; b.currentTime = a.currentTime; b.playbackRate = 1; }
      else b.playbackRate = Math.abs(d) < 0.04 ? 1 : d > 0 ? 0.94 : 1.06;
      raf = requestAnimationFrame(tick);
    };
    const handlers: [HTMLVideoElement, string, () => void][] = [];
    for (const v of [a, b]) for (const [ev, f] of [["waiting", wait(v)], ["playing", ready(v)], ["canplay", ready(v)], ["canplaythrough", ready(v)]] as const) {
      v.addEventListener(ev, f); handlers.push([v, ev, f]);
    }
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (seen) { go(); raf = requestAnimationFrame(tick); } else { a.pause(); b.pause(); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); for (const [v, ev, f] of handlers) v.removeEventListener(ev, f); };
  }, [near]);

  const cue: ClipCue | undefined = CLIP.cues.find((c) => t >= c.start && t < c.end);
  const video = (ref: React.RefObject<HTMLVideoElement | null>, src: string, poster: string) => (
    <video ref={ref} className="hm-clip" src={near ? src : undefined} poster={near ? poster : undefined} muted loop playsInline preload={near ? "auto" : "none"} aria-hidden="true" tabIndex={-1} />
  );

  return (
    <div className="hm-vs" ref={box}>
      <figure className="hm-pair rise">
        <div className="hm-frame bad">
          {video(lead, CLIP.src, CLIP.poster)}
          <span className="hm-frame-tag">Usual auto-captions</span>
          <p className="hm-cap" lang="ta" aria-live="off">{cue ? <Marked text={cue.bad} /> : "\u00a0"}</p>
        </div>
        <figcaption>English words forced into Tamil letters, and no English line.</figcaption>
      </figure>
      <figure className="hm-pair rise" style={{ "--d": "0.08s" } as React.CSSProperties}>
        <div className="hm-frame good">
          {video(follow, CLIP.styled, CLIP.styledPoster)}
          <span className="hm-frame-tag">Vasanamm</span>
        </div>
        <figcaption>Exported from Vasanamm in the Bold Bar style: Tanglish written the way it was said.</figcaption>
      </figure>
    </div>
  );
}

/** Words wrapped in [square brackets] are the forced ones: underlined in red. */
function Marked({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\])/).map((p, i) => (p.startsWith("[") ? <span key={i} className="sq">{p.slice(1, -1)}</span> : p))}</>;
}
