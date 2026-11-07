"use client";
import { useEffect, useRef, type PointerEventHandler, type RefObject } from "react";
import { LEVEL_STEP } from "@/lib/waveform";

const H = 32; // the row's height, px

/** The sound along the timeline, drawn only for the part in view: tall where someone speaks, flat where it's quiet. */
export default function Waveform({ levels, scroller, zoom, onPointerDown }: {
  levels: Uint8Array; scroller: RefObject<HTMLDivElement | null>; zoom: number; onPointerDown: PointerEventHandler;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = scroller.current, c = canvas.current;
    if (!el || !c) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const width = el.clientWidth, dpr = devicePixelRatio || 1;
      if (!width) return;
      c.style.left = `${el.scrollLeft}px`;
      c.style.width = `${width}px`;
      if (c.width !== Math.round(width * dpr)) { c.width = Math.round(width * dpr); c.height = Math.round(H * dpr); }
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, width, H);
      g.fillStyle = "#7fe3d0";
      for (let x = 0; x < width; x++) {
        const from = Math.floor((el.scrollLeft + x) / zoom / LEVEL_STEP), to = Math.max(from + 1, Math.ceil((el.scrollLeft + x + 1) / zoom / LEVEL_STEP));
        if (from >= levels.length) break;
        let peak = 0;
        for (let i = from; i < Math.min(to, levels.length); i++) if (levels[i] > peak) peak = levels[i];
        const v = peak / 255, h = Math.max(1, v * v * (H - 2)); // squared: pauses in speech drop away clearly
        g.fillRect(x, (H - h) / 2, 1, h);
      }
    };
    const soon = () => { raf ||= requestAnimationFrame(paint); };
    soon();
    el.addEventListener("scroll", soon, { passive: true });
    const sized = new ResizeObserver(soon); // the timeline may start hidden
    sized.observe(el);
    return () => { cancelAnimationFrame(raf); sized.disconnect(); el.removeEventListener("scroll", soon); };
  }, [levels, scroller, zoom]);
  return <div className="tl-wave" onPointerDown={onPointerDown} title="The sound: tall where someone speaks. Click or drag to move the playhead"><canvas ref={canvas} aria-hidden="true" /></div>;
}
