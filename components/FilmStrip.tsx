"use client";
import { useEffect, useRef, type PointerEventHandler, type RefObject } from "react";

const H = 46, MAX = 900; // the strip's height (px), and how many pictures are kept
const bucket = (t: number) => Math.round(t * 10); // a picture per tenth of a second at most

/**
 * The video as pictures along the timeline. Pictures come from a second, hidden video element, only for the part in
 * view, and are kept as they arrive, so scrolling and zooming back are instant. Until one arrives its neighbour stands in.
 */
export default function FilmStrip({ src, scroller, zoom, duration, onPointerDown }: {
  src?: string; scroller: RefObject<HTMLDivElement | null>; zoom: number; duration: number; onPointerDown: PointerEventHandler;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef({ zoom, duration });
  const repaint = useRef(() => {});
  useEffect(() => { view.current = { zoom, duration }; repaint.current(); }, [zoom, duration]);

  useEffect(() => {
    const el = scroller.current, c = canvas.current;
    if (!src || !el || !c) return;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const cache = new Map<number, HTMLCanvasElement>();
    let want: number[] = [], busy = false, ready = false, raf = 0;

    const nearest = (key: number) => {
      let best: HTMLCanvasElement | undefined, gap = Infinity;
      for (const [k, p] of cache) if (Math.abs(k - key) < gap) { gap = Math.abs(k - key); best = p; }
      return best;
    };
    const paint = () => {
      raf = 0;
      const { zoom, duration } = view.current, width = el.clientWidth, dpr = devicePixelRatio || 1;
      if (!width || !ready || !v.videoWidth) return;
      c.style.left = `${el.scrollLeft}px`;
      c.style.width = `${width}px`;
      if (c.width !== Math.round(width * dpr)) { c.width = Math.round(width * dpr); c.height = Math.round(H * dpr); }
      const g = c.getContext("2d")!, cell = Math.max(H, (H * v.videoWidth) / v.videoHeight);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, width, H);
      const missing: number[] = [], end = Math.min(el.scrollLeft + width, duration * zoom);
      for (let x = Math.floor(el.scrollLeft / cell) * cell; x < end; x += cell) {
        const t = Math.min(Math.max(0, duration - 0.05), (x + cell / 2) / zoom), key = bucket(t), p = cache.get(key) ?? nearest(key);
        if (!cache.has(key)) missing.push(key / 10);
        if (p) g.drawImage(p, x - el.scrollLeft, 0, Math.min(cell, duration * zoom - x), H);
      }
      want = missing;
      next();
    };
    const soon = () => { raf ||= requestAnimationFrame(paint); };
    repaint.current = soon;
    const next = () => {
      if (busy || !want.length) return;
      busy = true;
      v.currentTime = want.shift()!;
    };
    const onSeeked = () => {
      const { videoWidth: w, videoHeight: h } = v, cell = Math.max(H, (H * w) / h), dpr = devicePixelRatio || 1;
      const p = document.createElement("canvas");
      p.width = Math.round(cell * dpr);
      p.height = Math.round(H * dpr);
      // The picture's middle, filling the cell: tall videos are cropped to a square-ish frame.
      const scale = Math.max(p.width / w, p.height / h), sw = p.width / scale, sh = p.height / scale;
      p.getContext("2d")!.drawImage(v, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, p.width, p.height);
      cache.set(bucket(v.currentTime), p);
      if (cache.size > MAX) cache.delete(cache.keys().next().value!);
      busy = false;
      soon();
    };
    const onReady = () => { ready = true; soon(); };
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("loadeddata", onReady);
    el.addEventListener("scroll", soon, { passive: true });
    const sized = new ResizeObserver(soon); // the timeline may start hidden
    sized.observe(el);
    v.src = src;
    return () => {
      cancelAnimationFrame(raf);
      sized.disconnect();
      el.removeEventListener("scroll", soon);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("loadeddata", onReady);
      v.removeAttribute("src");
      v.load();
      repaint.current = () => {};
    };
  }, [src, scroller]);

  return (
    <div className="tl-film" onPointerDown={onPointerDown} title="The video: click or drag to move the playhead">
      {src ? <canvas ref={canvas} aria-hidden="true" /> : <span className="tl-row-hint">Choose the video to see it here</span>}
    </div>
  );
}
