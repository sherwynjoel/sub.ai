"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Cue } from "@/db/schema";
import { wordTimes } from "@/lib/captionStyles";

type Props = {
  cues: Cue[]; duration: number; now: number; selected: number; zoom: number; line: "ta" | "en";
  playing: boolean;
  onSeek: (t: number) => void;
  onSelect: (i: number) => void;
  /** Live change while dragging (not yet an undo step). */
  onDrag: (i: number, patch: Partial<Cue>) => void;
  /** The drag finished: record one undo step. */
  onDragEnd: () => void;
  /** Text layers, on their own row. */
  layers?: { start: number; end: number; label: string }[];
  selectedLayer?: number;
  onSelectLayer?: (i: number) => void;
  onDragLayer?: (i: number, span: { start: number; end: number }) => void;
  /** Zoom (px per second), from the timeline's own −/+ and pinch / Ctrl+scroll. */
  onZoom?: (zoom: number) => void;
};

export const ZOOM_MIN = 10, ZOOM_MAX = 600;

const MIN = 0.2; // shortest caption, seconds
const GAP = 0.05; // smallest gap kept between words

/** Ruler step that keeps labels about 80 px apart at this zoom (px per second). */
function step(zoom: number) {
  for (const s of [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]) if (s * zoom >= 80) return s;
  return 600;
}
const label = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}${s % 1 ? "." + Math.round((s % 1) * 10) : ""}`;

/** Times of a line's words scaled from one span of the caption to another (when its start or end is dragged). */
const rescale = (t: number[] | undefined, s0: number, e0: number, s1: number, e1: number) =>
  t && t.map((x) => s1 + ((x - s0) * (e1 - s1)) / Math.max(0.001, e0 - s0));

/**
 * Caption blocks on a timeline: click to select and move the playhead, drag a block to move it, drag its edges to
 * change when it starts or ends, drag the word marks of the selected caption to retime its words.
 */
export default function Timeline({ cues, duration, now, selected, zoom, line, playing, onSeek, onSelect, onDrag, onDragEnd, layers = [], selectedLayer = -1, onSelectLayer, onDragLayer, onZoom }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const width = Math.max(duration, 1) * zoom + 40;
  const st = step(zoom);

  // Zoom keeps one moment in place on screen (under the cursor, or the playhead): the new scroll is set once the
  // parent has re-rendered at the new zoom.
  const anchor = useRef<{ t: number; x: number } | null>(null);
  const zoomRef = useRef(zoom), nowRef = useRef(now), onZoomRef = useRef(onZoom);
  useEffect(() => { zoomRef.current = zoom; nowRef.current = now; onZoomRef.current = onZoom; });
  const zoomTo = (z: number, t: number, x: number) => {
    const next = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 100) / 100;
    if (next === zoomRef.current) return;
    anchor.current = { t, x };
    onZoomRef.current?.(next);
  };
  useLayoutEffect(() => {
    const el = scroller.current, a = anchor.current;
    if (el && a) { el.scrollLeft = a.t * zoom - a.x; anchor.current = null; }
  }, [zoom]);
  /** Zoom around the playhead (the −/+ keys and buttons). */
  const zoomBy = (f: number) => {
    const el = scroller.current;
    if (!el) return;
    const x = Math.min(el.clientWidth - 40, Math.max(40, nowRef.current * zoomRef.current - el.scrollLeft));
    zoomTo(zoomRef.current * f, nowRef.current, x);
  };
  /** The whole video in view. */
  const fit = () => { const el = scroller.current; if (el) zoomTo((el.clientWidth - 44) / Math.max(1, duration), 0, 0); };

  // The wheel: scrolling (either direction) moves along the timeline; pinch or Ctrl/⌘ + scroll zooms at the cursor.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect(), x = e.clientX - r.left;
        zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.01), (el.scrollLeft + x) / zoomRef.current, x);
      } else el.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  // Follow the playhead while playing.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !playing) return;
    const x = now * zoom;
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 80) el.scrollLeft = x - 120;
  }, [now, zoom, playing]);

  const timeAt = (clientX: number) => {
    const el = scroller.current!;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(duration, (clientX - r.left + el.scrollLeft) / zoom));
  };

  /** Start a drag: move the whole caption, one edge, or word j. A press without movement selects and seeks. */
  function grab(e: React.PointerEvent, i: number, mode: "move" | "start" | "end" | number) {
    e.stopPropagation();
    e.preventDefault();
    const c0 = cues[i], prevEnd = i > 0 ? cues[i - 1].end : 0, nextStart = i + 1 < cues.length ? cues[i + 1].start : Math.max(duration, c0.end);
    const x0 = e.clientX;
    const words = wordTimes(line === "en" ? c0.en : c0.ta, c0.start, c0.end, line === "en" ? c0.we : c0.w).map((w) => w.s);
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / zoom;
      if (!moved && Math.abs(ev.clientX - x0) < 3) return;
      moved = true;
      if (mode === "move") {
        const len = c0.end - c0.start;
        const s = Math.min(Math.max(prevEnd, c0.start + dt), nextStart - len), d = s - c0.start;
        onDrag(i, { start: s, end: s + len, w: c0.w?.map((x) => x + d), we: c0.we?.map((x) => x + d) });
      } else if (mode === "start") {
        const s = Math.min(Math.max(prevEnd, c0.start + dt), c0.end - MIN);
        onDrag(i, { start: s, w: rescale(c0.w, c0.start, c0.end, s, c0.end), we: rescale(c0.we, c0.start, c0.end, s, c0.end) });
      } else if (mode === "end") {
        const en = Math.max(Math.min(nextStart, c0.end + dt), c0.start + MIN);
        onDrag(i, { end: en, w: rescale(c0.w, c0.start, c0.end, c0.start, en), we: rescale(c0.we, c0.start, c0.end, c0.start, en) });
      } else {
        const j = mode, lo = j ? words[j - 1] + GAP : c0.start, hi = j + 1 < words.length ? words[j + 1] - GAP : c0.end - GAP;
        const t = Math.min(hi, Math.max(lo, words[j] + dt));
        const next = words.slice();
        next[j] = Math.round(t * 1000) / 1000;
        onDrag(i, line === "en" ? { we: next } : { w: next });
      }
    };
    const up = (ev: PointerEvent) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      if (moved) onDragEnd();
      else if (ev.type === "pointerup") { onSelect(i); onSeek(typeof mode === "number" ? words[mode] : timeAt(ev.clientX)); }
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up); // a touch taken over by scrolling
  }

  /** Drag a text layer (move, or one edge); a press without movement selects it. */
  function grabLayer(e: React.PointerEvent, i: number, mode: "move" | "start" | "end") {
    e.stopPropagation();
    e.preventDefault();
    const l0 = layers[i], x0 = e.clientX, len = l0.end - l0.start;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / zoom;
      if (!moved && Math.abs(ev.clientX - x0) < 3) return;
      moved = true;
      if (mode === "move") { const st = Math.min(Math.max(0, l0.start + dt), Math.max(0, duration - len)); onDragLayer?.(i, { start: st, end: st + len }); }
      else if (mode === "start") onDragLayer?.(i, { start: Math.min(Math.max(0, l0.start + dt), l0.end - MIN), end: l0.end });
      else onDragLayer?.(i, { start: l0.start, end: Math.max(Math.min(duration, l0.end + dt), l0.start + MIN) });
    };
    const up = (ev: PointerEvent) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      if (moved) onDragEnd();
      else if (ev.type === "pointerup") { onSelectLayer?.(i); onSeek(timeAt(ev.clientX)); }
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up); // a touch taken over by scrolling
  }

  /** Grab the empty track and drag to slide the timeline; a click without moving puts the playhead there. */
  function pan(e: React.PointerEvent) {
    e.preventDefault();
    const el = scroller.current!, x0 = e.clientX, s0 = el.scrollLeft;
    let moved = false;
    el.classList.add("panning");
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < 4) return;
      moved = true;
      el.scrollLeft = s0 - (ev.clientX - x0);
    };
    const up = (ev: PointerEvent) => {
      el.classList.remove("panning");
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      if (!moved && ev.type === "pointerup") onSeek(timeAt(ev.clientX));
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
  }

  /** Scrub: press on the ruler and drag to move the playhead. */
  function scrub(e: React.PointerEvent) {
    e.preventDefault();
    onSeek(timeAt(e.clientX));
    const move = (ev: PointerEvent) => onSeek(timeAt(ev.clientX));
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up); // a touch taken over by scrolling
  }

  // Layers that overlap in time go on separate lanes.
  const laneEnds: number[] = [];
  const lanes = layers.map((l) => {
    let k = laneEnds.findIndex((e) => e <= l.start + 0.001);
    if (k < 0) { k = laneEnds.length; laneEnds.push(0); }
    laneEnds[k] = l.end;
    return k;
  });
  const laneCount = Math.max(1, laneEnds.length);

  const ticks = [];
  for (let t = 0; t <= duration; t += st) ticks.push(t); // up to the end (a label past it would widen the strip)
  const sel = cues[selected];
  const selWords = sel ? wordTimes(line === "en" ? sel.en : sel.ta, sel.start, sel.end, line === "en" ? sel.we : sel.w) : [];

  return (
    <div className="tl-wrap">
    <div className="tl-zoom" role="group" aria-label="Timeline zoom">
      <button onClick={() => zoomBy(1 / 1.4)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out (−)" title="Zoom out (−, or pinch / Ctrl + scroll)">−</button>
      <button onClick={fit} className="tl-fit" title="Show the whole video">Fit</button>
      <button onClick={() => zoomBy(1.4)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in (+)" title="Zoom in (+, or pinch / Ctrl + scroll)">+</button>
    </div>
    <div className="tl" ref={scroller}>
      <div className="tl-inner" style={{ width, height: 132 + laneCount * 32 }}>
        <div className="tl-ruler" onPointerDown={scrub}>
          {ticks.map((t) => <span key={t} className="tl-tick" style={{ left: t * zoom }}>{label(t)}</span>)}
        </div>
        <div className="tl-track" onPointerDown={pan}>
          {cues.map((c, i) => (
            <div key={i} className={`tl-block${i === selected ? " on" : ""}`} style={{ left: c.start * zoom, width: Math.max(4, (c.end - c.start) * zoom) }}
              onPointerDown={(e) => grab(e, i, "move")} title={`${(line === "en" ? c.en : c.ta) || "(empty)"}\nDrag to move · drag the edges to retime`}>
              <span className="tl-text">{(line === "en" ? c.en : c.ta) || "…"}</span>
              <i className="tl-edge l" onPointerDown={(e) => grab(e, i, "start")} />
              <i className="tl-edge r" onPointerDown={(e) => grab(e, i, "end")} />
            </div>
          ))}
        </div>
        {sel && (
          <div className="tl-words" onPointerDown={pan}>
            {selWords.map((w, j) => (
              <span key={j} className="tl-word" style={{ left: w.s * zoom, width: Math.max(2, (w.e - w.s) * zoom) }} onPointerDown={(e) => grab(e, selected, j)} title={`${w.w} — drag to retime this word`}>
                <b>{w.w}</b>
              </span>
            ))}
          </div>
        )}
        <div className="tl-layers" style={{ height: laneCount * 32 + 4 }} onPointerDown={pan}>
          {layers.map((l, i) => (
            <div key={i} className={`tl-block tl-layer${i === selectedLayer ? " on" : ""}`} style={{ left: l.start * zoom, width: Math.max(4, (l.end - l.start) * zoom), top: 4 + lanes[i] * 32 }}
              onPointerDown={(e) => grabLayer(e, i, "move")} title={`${l.label}\nText layer: drag to move · drag the edges to retime`}>
              <span className="tl-text">{l.label}</span>
              <i className="tl-edge l" onPointerDown={(e) => grabLayer(e, i, "start")} />
              <i className="tl-edge r" onPointerDown={(e) => grabLayer(e, i, "end")} />
            </div>
          ))}
        </div>
        <i className="tl-head" style={{ left: now * zoom }} />
      </div>
    </div>
    </div>
  );
}
