"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Cue } from "@/db/schema";
import FilmStrip from "@/components/FilmStrip";
import Waveform from "@/components/Waveform";
import TimeInput from "@/components/TimeInput";
import { wordTimes } from "@/lib/captionStyles";
import { MIN_CAPTION as MIN, retime, shiftFrom, stretchEnd } from "@/lib/cueEdit";

type Props = {
  cues: Cue[]; duration: number; now: number; selected: number; zoom: number; line: "ta" | "en";
  playing: boolean;
  /** The player: the playhead reads it every frame while playing. */
  video: React.RefObject<HTMLVideoElement | null>;
  /** The video's address, for the pictures along the timeline. */
  src?: string;
  /** The sound's shape (lib/waveform.ts), when known. */
  levels?: Uint8Array | null;
  /** One frame of the video, seconds: drags land on frames. */
  frame: number;
  onSeek: (t: number) => void;
  onSelect: (i: number) => void;
  /** All the captions, live while dragging (not yet an undo step): those around the one dragged make room. */
  onDrag: (next: Cue[]) => void;
  /** The drag finished: record one undo step. */
  onDragEnd: () => void;
  /** Text layers, on their own row. */
  layers?: { start: number; end: number; label: string }[];
  selectedLayer?: number;
  onSelectLayer?: (i: number) => void;
  onDragLayer?: (i: number, span: { start: number; end: number }) => void;
  /** Zoom (px per second), from the timeline's own −/+ and pinch / Ctrl+scroll. */
  onZoom?: (zoom: number) => void;
  /** Add a caption / a text layer at a time; the index of the new one (-1: no room). */
  onAddCaption?: (t: number) => number;
  onAddText?: (t: number) => number;
  /** A new caption between caption j and the next (room made from both); the new one's index, -1: no room. */
  onInsertBetween?: (j: number) => number;
  /** Delete caption i (its neighbours take its time back when they touched it). */
  onDelete?: (i: number) => void;
  /** Delete text layer i. */
  onDeleteLayer?: (i: number) => void;
  /** A click on an empty spot: nothing selected any more. */
  onDeselect?: () => void;
  /** Text typed into a caption / a text layer on the timeline. */
  onCaptionText?: (i: number, text: string) => void;
  onLayerText?: (i: number, text: string) => void;
  /** Moving a caption takes the later ones with it. */
  ripple?: boolean;
  onRipple?: (on: boolean) => void;
  /** The picked caption or text given a new span (typed, or set from the playhead); one undo step. */
  onSpan?: (start: number, end: number) => void;
  /** The picked one moved a little, seconds. */
  onNudge?: (d: number) => void;
  onSplit?: () => void;
  onMerge?: () => void;
};

export const ZOOM_MIN = 10, ZOOM_MAX = 600;

const GAP = 0.05; // smallest gap kept between words

/** Ruler step that keeps labels about 80 px apart at this zoom (px per second). */
function step(zoom: number) {
  for (const s of [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]) if (s * zoom >= 80) return s;
  return 600;
}
const label = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}${s % 1 ? "." + Math.round((s % 1) * 10) : ""}`;

/** The playhead's time, to the hundredth. */
const stamp = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;

/**
 * Caption blocks on a timeline: click to select and move the playhead, drag a block to move it, drag its edges to
 * change when it starts or ends (the captions around it make room), drag the word marks of the selected caption to
 * retime its words. The bar above types exact times and holds the actions for what's selected. On touch a swipe scrolls:
 * a caption is tapped first, then dragged.
 */
export default function Timeline({ cues, duration, now, selected, zoom, line, playing, video, src, levels, frame, onSeek, onSelect, onDrag, onDragEnd, layers = [], selectedLayer = -1, onSelectLayer, onDragLayer, onZoom, onAddCaption, onAddText, onCaptionText, onLayerText, onInsertBetween, onDelete, onDeleteLayer, onDeselect, ripple, onRipple, onSpan, onNudge, onSplit, onMerge }: Props) {
  // A caption or text layer being typed into, right on the timeline.
  const [typing, setTyping] = useState<{ kind: "cue" | "layer"; i: number } | null>(null);
  const [dragging, setDragging] = useState(false); // a drag under way: its times show over the timeline
  /** Add one at t (an empty spot double-clicked, or the playhead) and start typing into it. */
  const addAt = (kind: "cue" | "layer", t: number) => {
    const i = (kind === "cue" ? onAddCaption : onAddText)?.(t) ?? -1;
    if (i >= 0) setTyping({ kind, i });
  };
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

  // While playing, the playhead follows the video every frame (the page's own time only updates a few times a second),
  // and the timeline follows the playhead.
  const head = useRef<HTMLElement>(null), headTime = useRef<HTMLElement>(null);
  const place = (t: number) => {
    if (head.current) head.current.style.left = `${t * zoom}px`;
    if (headTime.current) headTime.current.textContent = stamp(t);
  };
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const el = scroller.current, t = video.current?.currentTime ?? 0, x = t * zoom;
      place(t);
      if (el && (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 80)) el.scrollLeft = x - 120;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, zoom, video]);
  useLayoutEffect(() => { if (!playing) place(now); }); // eslint-disable-line react-hooks/exhaustive-deps

  /** Where a drag lands: on the playhead or a neighbour's edge when close to it, otherwise on a frame of the video. */
  const snap = (t: number, edges: number[] = []) => [now, ...edges].find((p) => Math.abs(t - p) * zoom < 6) ?? Math.round(t / frame) * frame;

  const timeAt = (clientX: number) => {
    const el = scroller.current!;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(duration, (clientX - r.left + el.scrollLeft) / zoom));
  };

  /**
   * Follow a press: apply() gets the seconds dragged, the timeline scrolling along at its ends, and done() whether it
   * moved at all. tapOnly: never a drag (a swipe there scrolls instead).
   */
  function follow(e: React.PointerEvent, apply: (dt: number) => void, done: (moved: boolean, ev: PointerEvent) => void, tapOnly = false) {
    e.stopPropagation();
    if (tapOnly) (document.activeElement as HTMLElement | null)?.blur?.();
    else { e.preventDefault(); if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur(); } // a time being typed is kept
    const el = scroller.current!, x0 = e.clientX, s0 = el.scrollLeft;
    let x = x0, moved = false, raf = 0;
    const seconds = () => (x - x0 + el.scrollLeft - s0) / zoom;
    const roll = () => {
      const r = el.getBoundingClientRect(), v = x < r.left + 40 ? (x - r.left - 40) / 4 : x > r.right - 40 ? (x - r.right + 40) / 4 : 0;
      if (v) { el.scrollLeft += v; apply(seconds()); }
      raf = requestAnimationFrame(roll);
    };
    const move = (ev: PointerEvent) => {
      x = ev.clientX;
      if (tapOnly || (!moved && Math.abs(x - x0) < 3)) return;
      if (!moved) { moved = true; setDragging(true); raf = requestAnimationFrame(roll); }
      apply(seconds());
    };
    const up = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      setDragging(false);
      done(moved, ev);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up); // a touch taken over by scrolling
  }

  /** Start a drag: move the whole caption, one edge, or word j. A press without movement selects and seeks. */
  function grab(e: React.PointerEvent, i: number, mode: "move" | "start" | "end" | number) {
    const base = cues, c0 = base[i], len = c0.end - c0.start;
    const edges = [base[i - 1]?.end, base[i + 1]?.start].filter((t) => t !== undefined);
    const words = wordTimes(line === "en" ? c0.en : c0.ta, c0.start, c0.end, line === "en" ? c0.we : c0.w).map((w) => w.s);
    let picked = i === selected;
    follow(e, (dt) => {
      if (!picked) { picked = true; onSelect(i); }
      if (mode === "move") {
        const s = snap(c0.start + dt, edges.concat(edges.map((t) => t - len)));
        onDrag(ripple ? shiftFrom(base, i, s - c0.start, duration) : retime(base, i, s, s + len, duration));
      } else if (mode === "start") onDrag(retime(base, i, snap(c0.start + dt, edges), c0.end, duration));
      else if (mode === "end") { const en = snap(c0.end + dt, edges); onDrag(ripple ? stretchEnd(base, i, en, duration) : retime(base, i, c0.start, en, duration)); }
      else {
        const j = mode, lo = j ? words[j - 1] + GAP : c0.start, hi = j + 1 < words.length ? words[j + 1] - GAP : c0.end - GAP;
        const next = words.slice();
        next[j] = Math.round(Math.min(hi, Math.max(lo, snap(words[j] + dt))) * 1000) / 1000;
        onDrag(base.map((c, k) => (k === i ? { ...c, ...(line === "en" ? { we: next } : { w: next }) } : c)));
      }
    }, (moved, ev) => {
      if (moved) onDragEnd();
      else if (ev.type === "pointerup") { onSelect(i); onSeek(typeof mode === "number" ? words[mode] : timeAt(ev.clientX)); }
    }, e.pointerType === "touch" && i !== selected);
  }

  /** Drag a text layer (move, or one edge); a press without movement selects it. */
  function grabLayer(e: React.PointerEvent, i: number, mode: "move" | "start" | "end") {
    const l0 = layers[i], len = l0.end - l0.start;
    let picked = i === selectedLayer;
    follow(e, (dt) => {
      if (!picked) { picked = true; onSelectLayer?.(i); }
      if (mode === "move") { const st = Math.min(Math.max(0, snap(l0.start + dt)), Math.max(0, duration - len)); onDragLayer?.(i, { start: st, end: st + len }); }
      else if (mode === "start") onDragLayer?.(i, { start: Math.min(Math.max(0, snap(l0.start + dt)), l0.end - MIN), end: l0.end });
      else onDragLayer?.(i, { start: l0.start, end: Math.max(Math.min(duration, snap(l0.end + dt)), l0.start + MIN) });
    }, (moved, ev) => {
      if (moved) onDragEnd();
      else if (ev.type === "pointerup") { onSelectLayer?.(i); onSeek(timeAt(ev.clientX)); }
    }, e.pointerType === "touch" && i !== selectedLayer);
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
      if (!moved && ev.type === "pointerup") { onSeek(timeAt(ev.clientX)); onDeselect?.(); } // a click on an empty spot unselects
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
  const layer = layers[selectedLayer], span = layer ?? sel;

  // A caption picked elsewhere (the list, the ↑ ↓ keys) comes into view here.
  useEffect(() => {
    const el = scroller.current, c = cues[selected];
    if (!el || !c || playing) return;
    if (c.end * zoom < el.scrollLeft || c.start * zoom > el.scrollLeft + el.clientWidth) el.scrollLeft = Math.max(0, c.start * zoom - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="tl-wrap">
    <div className="tl-bar">
      {span ? (
        <div className="tl-edit" role="group" aria-label={layer ? "Time of this text" : "Time of this caption"}>
          <b>{layer ? "Text" : `Caption ${selected + 1}`}</b>
          <label>Start<TimeInput short key={`s${selected}-${selectedLayer}-${span.start}`} value={span.start} label="Start" onChange={(v) => onSpan?.(v, span.end)} /></label>
          <button className="btn ghost small" onClick={() => onSpan?.(now, span.end)} title="Start at the playhead ([)">Start here</button>
          <label>End<TimeInput short key={`e${selected}-${selectedLayer}-${span.end}`} value={span.end} label="End" onChange={(v) => onSpan?.(span.start, v)} /></label>
          <button className="btn ghost small" onClick={() => onSpan?.(span.start, now)} title="End at the playhead (])">End here</button>
          <label>Length<TimeInput short key={`l${selected}-${selectedLayer}-${span.end - span.start}`} value={span.end - span.start} label="Length" onChange={(v) => onSpan?.(span.start, span.start + v)} /></label>
          <span className="seg" role="group" aria-label="Move one frame">
            <button onClick={() => onNudge?.(-frame)} aria-label="One frame earlier" title="One frame earlier (,)">◀</button>
            <button onClick={() => onNudge?.(frame)} aria-label="One frame later" title="One frame later (.)">▶</button>
          </span>
          {!layer && <>
            <button className="btn ghost small" onClick={onSplit} title="Split at the playhead (S)">Split</button>
            <button className="btn ghost small" onClick={onMerge} disabled={selected + 1 >= cues.length} title="Join with the next caption (M)">Merge</button>
          </>}
          <button className="btn ghost small tl-delb" onClick={() => (layer ? onDeleteLayer?.(selectedLayer) : onDelete?.(selected))} title="Delete (Delete key)">Delete</button>
        </div>
      ) : <span className="tl-hint">Pick a caption to change its time. Drag it, or drag its edges: the captions next to it make room.</span>}
      <label className="tl-ripple" title="Moving a caption moves every caption after it by the same amount, to put them back in sync">
        <input type="checkbox" checked={!!ripple} onChange={(e) => onRipple?.(e.target.checked)} />Move later captions too
      </label>
      <div className="tl-zoom" role="group" aria-label="Add text and zoom">
        <button className="tl-addb" onClick={() => addAt("cue", now)} title="Add a caption at the playhead (or double-click an empty spot in the caption row)">+ Caption</button>
        <button className="tl-addb" onClick={() => addAt("layer", now)} title="Add text over the video at the playhead (or double-click the text row)">+ Text</button>
        <i className="tl-sep" />
        <button onClick={() => zoomBy(1 / 1.4)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out (−)" title="Zoom out (−, or pinch / Ctrl + scroll)">−</button>
        <button onClick={fit} className="tl-fit" title="Show the whole video">Fit</button>
        <button onClick={() => zoomBy(1.4)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in (+)" title="Zoom in (+, or pinch / Ctrl + scroll)">+</button>
      </div>
    </div>
    <div className="tl" ref={scroller}>
      <div className="tl-inner" style={{ width, height: 184 + laneCount * 32 + (levels ? 34 : 0), "--wave": levels ? "34px" : "0px" } as React.CSSProperties}>
        <div className="tl-ruler" onPointerDown={scrub}>
          {ticks.map((t) => <span key={t} className="tl-tick" style={{ left: t * zoom }}>{label(t)}</span>)}
        </div>
        <FilmStrip src={src} scroller={scroller} zoom={zoom} duration={duration} onPointerDown={scrub} />
        {levels && <Waveform levels={levels} scroller={scroller} zoom={zoom} onPointerDown={scrub} />}
        <div className="tl-track" onPointerDown={pan} onDoubleClick={(e) => { if (e.target === e.currentTarget) addAt("cue", timeAt(e.clientX)); }}
          title="Double-click an empty spot to add a caption there">
          {cues.map((c, i) => (
            <div key={i} className={`tl-block${i === selected ? " on" : ""}${typing?.kind === "cue" && typing.i === i ? " typing" : ""}`} style={{ left: c.start * zoom, width: Math.max(4, (c.end - c.start) * zoom) }}
              onPointerDown={(e) => grab(e, i, "move")} onDoubleClick={() => setTyping({ kind: "cue", i })}
              title={`${(line === "en" ? c.en : c.ta) || "(empty)"}\nDrag to move · drag the edges to change the time · double-click to edit the text`}>
              {typing?.kind === "cue" && typing.i === i
                ? <TypeIn value={line === "en" ? c.en : c.ta} onDone={(v) => { setTyping(null); if (v !== null) onCaptionText?.(i, v); }} />
                : <span className="tl-text">{(line === "en" ? c.en : c.ta) || "…"}</span>}
              <i className="tl-edge l" onPointerDown={(e) => grab(e, i, "start")} />
              <i className="tl-edge r" onPointerDown={(e) => grab(e, i, "end")} />
            </div>
          ))}
        </div>
        {/* Between two captions (and after the last): + puts a new caption there, making room from both sides. The one
            at the selected caption's ends always shows; the others when the pointer is on the row (all of them on touch). */}
        {onInsertBetween && (
          <div className="tl-pluses">
            {cues.map((c, j) => {
              const nextStart = j + 1 < cues.length ? cues[j + 1].start : null;
              if (nextStart !== null && nextStart - c.end > 1.2) return null; // room already: double-click the gap
              const near = j === selected || j + 1 === selected;
              return (
                <button key={j} type="button" className={`tl-plus${near ? " near" : ""}`} style={{ left: c.end * zoom }}
                  aria-label={`Add a caption ${nextStart === null ? "after the last one" : `between captions ${j + 1} and ${j + 2}`}`}
                  title="Add a caption here (room is made from the captions on both sides)"
                  onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); const i = onInsertBetween(j); if (i >= 0) setTyping({ kind: "cue", i }); }}>+</button>
              );
            })}
          </div>
        )}
        {sel && (
          <div className="tl-words" onPointerDown={pan}>
            {selWords.map((w, j) => (
              <span key={j} className="tl-word" style={{ left: w.s * zoom, width: Math.max(2, (w.e - w.s) * zoom) }} onPointerDown={(e) => grab(e, selected, j)} title={`${w.w} — drag to retime this word`}>
                <b>{w.w}</b>
              </span>
            ))}
          </div>
        )}
        <div className="tl-layers" style={{ height: laneCount * 32 + 4 }} onPointerDown={pan} onDoubleClick={(e) => { if (e.target === e.currentTarget) addAt("layer", timeAt(e.clientX)); }}
          title="Text over the video: double-click an empty spot to add some there">
          {!layers.length && <span className="tl-row-hint">Text over the video: + Text adds some</span>}
          {layers.map((l, i) => (
            <div key={i} className={`tl-block tl-layer${i === selectedLayer ? " on" : ""}${typing?.kind === "layer" && typing.i === i ? " typing" : ""}`} style={{ left: l.start * zoom, width: Math.max(4, (l.end - l.start) * zoom), top: 4 + lanes[i] * 32 }}
              onPointerDown={(e) => grabLayer(e, i, "move")} onDoubleClick={() => setTyping({ kind: "layer", i })}
              title={`${l.label}\nText layer: drag to move · drag the edges to retime · double-click to edit the text`}>
              {typing?.kind === "layer" && typing.i === i
                ? <TypeIn value={l.label} onDone={(v) => { setTyping(null); if (v !== null) onLayerText?.(i, v); }} />
                : <span className="tl-text">{l.label}</span>}
              <i className="tl-edge l" onPointerDown={(e) => grabLayer(e, i, "start")} />
              <i className="tl-edge r" onPointerDown={(e) => grabLayer(e, i, "end")} />
            </div>
          ))}
        </div>
        {dragging && span && (
          <span className="tl-read tnum" style={{ left: Math.max(4, span.start * zoom) }}>{stamp(span.start)} → {stamp(span.end)} · {(span.end - span.start).toFixed(2)} s</span>
        )}
        <i className="tl-head" ref={head}><b ref={headTime} /></i>
      </div>
    </div>
    </div>
  );
}

/** Typing into a block on the timeline: Enter (or clicking away) keeps it, Esc leaves it as it was. */
function TypeIn({ value, onDone }: { value: string; onDone: (v: string | null) => void }) {
  return (
    <input className="tl-type" defaultValue={value} autoFocus aria-label="Text"
      onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.dataset.cancel = "1"; e.currentTarget.blur(); } }}
      onBlur={(e) => onDone(e.currentTarget.dataset.cancel ? null : e.currentTarget.value)} />
  );
}
