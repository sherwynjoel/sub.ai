"use client";
import { useEffect, useRef, useState } from "react";
import StyledCaption from "@/components/StyledCaption";
import { STYLE_CHOICES, STYLE_GROUPS } from "@/lib/captionStyles";
import "@/app/caption-styles.css";
import { PHONE_CLIP } from "@/lib/phoneClip";

// Lines people really post, each with its English under it; the preview moves to the next one every few loops.
const LINES = [
  { text: "Machi, இந்த edit semma!", sub: "Dude, this edit is awesome!" },
  { text: "மறக்காம page-அ follow பண்ணுங்க", sub: "Don't forget to follow the page" },
  { text: "Bro, இது next level!", sub: "Bro, this is next level!" },
];
const START = 0.1, END = 2.6, LOOP = 4.2;

/**
 * The homepage's style picker: a phone playing a real clip with its real subtitles in the picked style (lib/phoneClip.ts;
 * the sample lines below while it has none), and every style by name to tap, the popular ones first. It only plays
 * while it's on screen.
 */
export default function StyleWall({ popular }: { popular: string[] }) {
  const first = popular.find((id) => STYLE_CHOICES.some((s) => s.id === id)) ?? STYLE_CHOICES[0].id;
  const [id, setId] = useState(first);
  const [t, setT] = useState(END - 0.01);
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [vt, setVt] = useState(0); // the clip's time
  const [dur, setDur] = useState(72.6);
  const clip = PHONE_CLIP.cues.length > 0;
  const [open, setOpen] = useState(false); // the Dynamic Island showing the style's name
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setOpen(true); // eslint-disable-line react-hooks/set-state-in-effect -- opens for a moment after each pick
    const k = setTimeout(() => setOpen(false), 2400);
    return () => clearTimeout(k);
  }, [id]);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0, t0 = 0, raf = 0;
    const v = vid.current;
    const follow = () => { if (v) setVt(v.currentTime); raf = requestAnimationFrame(follow); };
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer); cancelAnimationFrame(raf);
      if (!e.isIntersecting) { v?.pause(); return; }
      if (v && PHONE_CLIP.cues.length) { v.play().catch(() => {}); raf = requestAnimationFrame(follow); return; }
      t0 = performance.now();
      timer = window.setInterval(() => {
        const s = (performance.now() - t0) / 1000;
        setT(s % LOOP);
        setN(Math.floor(s / (LOOP * 2)) % LINES.length);
      }, 50);
    });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); clearInterval(timer); cancelAnimationFrame(raf); };
  }, []);

  const style = STYLE_CHOICES.find((s) => s.id === id) ?? STYLE_CHOICES[0];
  const top = popular.filter((p) => STYLE_CHOICES.some((s) => s.id === p));
  const line = LINES[n];
  const ci = clip ? PHONE_CLIP.cues.findIndex((c) => vt >= c.start && vt < c.end) : -1, cue = ci >= 0 ? PHONE_CLIP.cues[ci] : null;

  return (
    <div className="sw" ref={ref}>
      <figure className="sw-phone" aria-label={`${style.name}: a preview of the style`}>
        <div className="sw-glow" aria-hidden="true" />
        <div className="iph-body sw-body">
          <i className="iph-btn mute" /><i className="iph-btn vol1" /><i className="iph-btn vol2" /><i className="iph-btn power" />
          <div className="iph-screen sw-screen">
            {clip
              ? <video ref={vid} className="sw-video" src={PHONE_CLIP.src} poster={PHONE_CLIP.poster} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 72.6)} />
              : /* A moody evening shot, drawn in CSS: sky, drifting city lights, film grain. */ <div className="sw-shot" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>}
            <div className="sw-status" aria-hidden="true">
              <b>9:41</b>
              <span className="iph-icons">
                <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                <svg viewBox="0 0 16 12"><path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.3-1.4A10.3 10.3 0 0 0 8 .4C5.2.4 2.6 1.5.7 3.4L2 4.8a8.4 8.4 0 0 1 6-2.4Zm0 3.8c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4.2c-1.8 0-3.5.7-4.7 1.9l1.3 1.4C5.5 6.7 6.7 6.2 8 6.2Zm0 3.7c-.6 0-1.1.2-1.5.6L8 12l1.5-1.5c-.4-.4-.9-.6-1.5-.6Z" /></svg>
                <span className="iph-batt"><i /></span>
              </span>
            </div>
            {/* The Dynamic Island opens for a moment with the style's name each time one is picked. */}
            <div className={`sw-island${open ? " open" : ""}`} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="sw-isl-art" src="/logo.png" alt="" width={64} height={64} />
              <span className="sw-isl-text"><small>Now styling</small><b>{style.name}</b></span>
              <span className="sw-wave"><i /><i /><i /><i /><i /></span>
            </div>
            <div className="sw-stage" aria-hidden="true">
              {clip
                ? cue && <StyledCaption key={`${id}-c${ci}`} styleId={id} text={cue.text} sub={cue.sub} start={cue.start} end={cue.end} time={Math.min(vt, cue.end - 0.01)} ratio={9 / 16} />
                : <StyledCaption key={`${id}-${n}`} styleId={id} text={line.text} sub={line.sub} start={START} end={END} time={Math.min(t, END - 0.01)} ratio={9 / 16} />}
            </div>
            <div className="sw-rail" aria-hidden="true">
              <span><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.7 3.8 4.2 7.3C19.5 16.4 12 21 12 21Z" /></svg>12.4K</span>
              <span><svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.5 1.2 4.7 3.2 6.3L4.5 21l3.9-1.8c1.1.3 2.3.5 3.6.5 5.5 0 10-3.9 10-8.7S17.5 3 12 3Z" /></svg>318</span>
              <span><svg viewBox="0 0 24 24"><path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" /></svg>Share</span>
            </div>
            <div className="sw-meta" aria-hidden="true">
              <b>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.png" alt="" width={48} height={48} />{clip ? "sudhir.srinivasan" : "kavya.edits"}</b>
              <span>{clip ? "With Riya Shibu · subtitles by Vasanamm" : "Machi vlog · ep 12 · subtitles by Vasanamm"}</span>
            </div>
            <div className="sw-progress" aria-hidden="true"><i style={{ width: `${clip ? (vt / dur) * 100 : (t / LOOP) * 100}%` }} /></div>
            <span className="iph-home" aria-hidden="true" />
          </div>
        </div>
        <figcaption><b>{style.name}</b><span>{style.group}</span></figcaption>
      </figure>

      <div className="sw-pick">
        <p className="sw-hint">Tap a name to see it.</p>
        <div className="sw-group">
          <h3>Popular</h3>
          <ul>
            {top.map((p) => <li key={p}><button type="button" aria-pressed={p === id} onClick={() => setId(p)}>{STYLE_CHOICES.find((s) => s.id === p)?.name}</button></li>)}
          </ul>
        </div>
        {STYLE_GROUPS.map((g) => {
          const list = STYLE_CHOICES.filter((s) => s.group === g && !top.includes(s.id));
          return list.length > 0 && (
            <div className="sw-group" key={g}>
              <h3>{g}</h3>
              <ul>
                {list.map((s) => <li key={s.id}><button type="button" aria-pressed={s.id === id} onClick={() => setId(s.id)}>{s.name}</button></li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
