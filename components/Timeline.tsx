"use client";
import { useEffect, useRef } from "react";
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
};

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
export default function Timeline({ cues, duration, now, selected, zoom, line, playing, onSeek, onSelect, onDrag, onDragEnd }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const width = Math.max(duration, 1) * zoom + 40;
  const st = step(zoom);

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
      if (moved) onDragEnd();
      else { onSelect(i); onSeek(typeof mode === "number" ? words[mode] : timeAt(ev.clientX)); }
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  }

  /** Scrub: press on the ruler or empty track and drag to move the playhead. */
  function scrub(e: React.PointerEvent) {
    e.preventDefault();
    onSeek(timeAt(e.clientX));
    const move = (ev: PointerEvent) => onSeek(timeAt(ev.clientX));
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  }

  const ticks = [];
  for (let t = 0; t <= duration + st; t += st) ticks.push(t);
  const sel = cues[selected];
  const selWords = sel ? wordTimes(line === "en" ? sel.en : sel.ta, sel.start, sel.end, line === "en" ? sel.we : sel.w) : [];

  return (
    <div className="tl" ref={scroller}>
      <div className="tl-inner" style={{ width }}>
        <div className="tl-ruler" onPointerDown={scrub}>
          {ticks.map((t) => <span key={t} className="tl-tick" style={{ left: t * zoom }}>{label(t)}</span>)}
        </div>
        <div className="tl-track" onPointerDown={scrub}>
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
          <div className="tl-words" onPointerDown={scrub}>
            {selWords.map((w, j) => (
              <span key={j} className="tl-word" style={{ left: w.s * zoom, width: Math.max(2, (w.e - w.s) * zoom) }} onPointerDown={(e) => grab(e, selected, j)} title={`${w.w} — drag to retime this word`}>
                <b>{w.w}</b>
              </span>
            ))}
          </div>
        )}
        <i className="tl-head" style={{ left: now * zoom }} />
      </div>
    </div>
  );
}
