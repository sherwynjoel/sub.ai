"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Cue } from "@/db/schema";
import { languageOf, shortCode } from "@/lib/languages";
import { CANVAS_RATIOS, CAPTION_FONTS, CAPTION_STYLES, mergeCustom, STYLE_CHOICES, STYLE_GROUPS, resolveStyle, SAFE_ZONES, styleOf, type CanvasRatio, type CaptionCustom, type SafeZoneId, type TextLayer } from "@/lib/captionStyles";
import { insertAt, mergeCues, setText, setWord, splitCue, startsOf, wordsOf } from "@/lib/cueEdit";
import { englishCues } from "@/lib/subtitles";
import { ISSUE_TEXT, timingIssues } from "@/lib/timing";
import { MAX_REDOS, typeLabel, typeOf, type CaptionType } from "@/lib/captionTypes";
import CaptionTypePicker from "@/components/CaptionTypePicker";
import { localVideo, progressOf, sendVideo, subscribeUploads, uploadsVersion } from "@/lib/videoUpload";
import SubtitleReveal from "@/components/SubtitleReveal";
import LookControls from "@/components/LookControls";
import StyledCaption from "@/components/StyledCaption";
import Timeline from "@/components/Timeline";
import WordStrip, { type WordRef } from "@/components/WordStrip";
import "@/app/caption-styles.css";

type Job = {
  id: string; filename: string; language: string; status: string; progress: number; error: string | null;
  hasMedia: boolean; videoTotal?: number | null; provider: string | null; model: string | null; cues: Cue[]; speech?: [number, number][]; script: string; redos: number;
  captionStyle: string; captionCustom: CaptionCustom; renderStatus: string | null; renderProgress: number; renderError: string | null; renderLang: string;
};
type View = "ta" | "en" | "both";
type Tab = "caption" | "layers" | "style" | "export";
type Pane = "list" | "caption" | "timeline" | "style" | "layers" | "export";
const PANES: [Pane, string][] = [["list", "Captions"], ["caption", "Edit"], ["timeline", "Timeline"], ["style", "Style"], ["layers", "Layers"], ["export", "Export"]];
const noop = () => () => {};
/** m:ss for the phone toolbar. */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** Toolbar icons (24 px grid, drawn with the current colour). */
const ICON: Record<string, string> = {
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  redo: "m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
  split: "M6 3v18M18 3v18M6 12h3M15 12h3M12 4v4M12 16v4",
  merge: "M8 6l4 6-4 6M16 6l-4 6 4 6",
  add: "M12 5v14M5 12h14",
  delete: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  save: "M5 12l5 5L20 7",
  text: "M4 7V5h16v2M12 5v14M9 19h6",
  mark: "m9 11-5 5v3h3l5-5M14 6l4 4-6 6-4-4z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  title: "M5 6h14M12 6v12M8 18h8",
  style: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.2-1-1.4-1-2.4 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 12h.01M10 7.5h.01M15 7.5h.01",
  lang: "M4 5h8M8 3v2M6 5c0 4 2 7 5 8M10 5c-1 4-3 7-6 8M13 20l4-9 4 9M14.5 17h5",
  play: "M7 4v16l13-8z",
  back: "M15 5l-7 7 7 7",
  guides: "M12 3v18M3 12h18M7 3v2M17 3v2M3 7h2M3 17h2",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
};
const Icon = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[name]} /></svg>;
const RATIO = { "9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1, "16:9": 16 / 9 } as const;
/** Settings that belong to the project, not to a look: picking a style or resetting the look keeps them. */
const PROJECT_KEYS: string[] = ["safe", "safeCustom", "canvas", "layers", "logo", "show", "lines"];
const projectOnly = (c: CaptionCustom): CaptionCustom => Object.fromEntries(Object.entries(c).filter(([k]) => PROJECT_KEYS.includes(k)));
const EMOJIS = ["😀", "😂", "🔥", "❤️", "👍", "🎉", "✨", "💯", "😍", "🙏", "👀", "⭐"];
const FRAME = 1 / 30;
/** Fonts added from the Premiere template pack: marked "New" in the font row. */
const NEW_FONTS: string[] = ["Inter", "Inter Bold", "Inter Italic", "Montserrat SemiBold", "Playfair Display Italic", "Playfair Display Bold Italic", "Nunito ExtraBold", "Open Sauce Sans Black"];

/** The styled caption over the player, redrawn every frame while the video plays so word timing is smooth. */
function LiveCaption({ video, cues, styleId, custom, portrait, view, selected, picked, editing, onMove, onResize, onTap, onEditOpen, onEditDone }: {
  video: React.RefObject<HTMLVideoElement | null>; cues: Cue[]; styleId: string; custom: CaptionCustom; portrait: boolean; view: View; selected: number;
  picked: (start: number) => boolean; editing: string | null;
  onMove: (i: number, x: number, y: number) => void;
  onResize: (i: number, size: number) => void;
  onTap: (start: number) => void; onEditOpen: () => void; onEditDone: (text: string | null) => void;
}) {
  const [t, setT] = useState(0);
  const [sizing, setSizing] = useState<number | null>(null); // the size shown while the corner is dragged
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let raf = 0;
    const tick = () => { setT(v.currentTime); if (!v.paused) raf = requestAnimationFrame(tick); };
    const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    for (const e of ["play", "pause", "seeked", "timeupdate"]) v.addEventListener(e, kick);
    return () => { cancelAnimationFrame(raf); for (const e of ["play", "pause", "seeked", "timeupdate"]) v.removeEventListener(e, kick); };
  }, [video]);
  let i = cues.findIndex((x) => t >= x.start && t < x.end);
  // Paused between lines: show the selected (or first) line as a stand-in so it can still be dragged and styled.
  const ghost = i < 0 && !!video.current?.paused;
  if (ghost) i = selected >= 0 ? selected : 0;
  const c = cues[i];
  if (!c) return null;
  const main = view === "en" ? c.en : c.ta;
  if (!main.trim()) return null;
  const own = mergeCustom(custom, c.style);
  const { position, offset, x, y, safe, size } = resolveStyle(styleId, own, portrait);
  const free = x !== undefined && y !== undefined;
  const pct = (n: number) => `${n * 100}%`;
  const sides = { left: pct(safe.left), right: pct(safe.right) };
  const place: React.CSSProperties = free ? { left: pct(x), top: pct(y), maxWidth: pct(Math.min(0.92, 2 * Math.min(x - safe.left, 1 - safe.right - x))) }
    : position === "top" ? { ...sides, top: pct(offset), bottom: "auto" }
    : position === "middle" ? { ...sides, top: pct((safe.top + 1 - safe.bottom) / 2), bottom: "auto", transform: "translateY(-50%)" }
    : { ...sides, bottom: pct(offset) };
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const frame = video.current?.parentElement?.getBoundingClientRect();
    if (!frame) return;
    e.preventDefault();
    video.current?.pause();
    onTap(c.start); // tapping a caption on the video picks it (and its tools come up under the video)
    follow(e, frame, (x, y) => { video.current?.pause(); onMove(i, x, y); }, 0.05);
  };
  // The corner dot resizes: the caption grows as the pointer moves away from its centre (Size, 40–260%).
  const resize = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget.parentElement as HTMLElement, box = handle.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const d0 = Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)), s0 = size ?? 1;
    let moving = false;
    const at = (ev: PointerEvent) => {
      const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      if (!moving && Math.abs(d - d0) < 4) return;
      if (!moving) guideStart(handle);
      moving = true;
      video.current?.pause();
      const next = Math.round(Math.min(2.6, Math.max(0.4, (s0 * d) / d0)) * 20) / 20; // steps of 5%
      setSizing(next);
      onResize(i, next);
    };
    const stop = () => { setSizing(null); if (moving) guideEnd(); removeEventListener("pointermove", at); removeEventListener("pointerup", stop); };
    addEventListener("pointermove", at);
    addEventListener("pointerup", stop);
  };
  const line = view === "en" ? "en" : "ta";
  return (
    <div className={`overlay styled${free ? " free" : ""}${ghost ? " ghost" : ""}${picked(c.start) ? " picked" : ""}`} style={place}>
      {editing !== null ? (
        <textarea className="cap-inline" lang={line === "ta" ? undefined : "en"} defaultValue={editing} autoFocus rows={2} aria-label="Caption text"
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } if (e.key === "Escape") onEditDone(null); }}
          onBlur={(e) => onEditDone(e.target.value)} />
      ) : (
      <div className="drag-handle" onPointerDown={drag} onDoubleClick={onEditOpen} title="Tap to pick, drag to move, double-click to edit the text">
        <StyledCaption styleId={styleId} custom={own} text={main} sub={view === "both" ? c.en : undefined} start={c.start} end={c.end} time={ghost ? c.end - 0.01 : t}
          starts={line === "en" ? c.we : c.w} colors={line === "en" ? c.wce : c.wc} />
        {video.current?.paused !== false && <span className="rs-handle" onPointerDown={resize} title="Drag to resize the subtitle" aria-hidden="true" />}
        {sizing !== null && <span className="rs-size">{Math.round(sizing * 100)}%</span>}
      </div>
      )}
    </div>
  );
}

/**
 * The corner dot: drag it away from the centre to grow the thing, towards it to shrink it (by the change in
 * distance from the centre). Reports the new size, kept within [min, max] in steps of `step`.
 */
function resizeFrom(e: React.PointerEvent, size0: number, min: number, max: number, step: number, onSize: (s: number) => void, onEnd?: () => void) {
  e.preventDefault();
  e.stopPropagation();
  const thing = (e.currentTarget as HTMLElement).parentElement as HTMLElement, box = thing.getBoundingClientRect();
  const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
  const d0 = Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy));
  let moving = false;
  const at = (ev: PointerEvent) => {
    const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
    if (!moving && Math.abs(d - d0) < 4) return;
    if (!moving) guideStart(thing);
    moving = true;
    onSize(Math.round(Math.min(max, Math.max(min, (size0 * d) / d0)) / step) * step);
  };
  const stop = () => { onEnd?.(); if (moving) guideEnd(); removeEventListener("pointermove", at); removeEventListener("pointerup", stop); };
  addEventListener("pointermove", at);
  addEventListener("pointerup", stop);
}

/** Text layers over the video at time t (the selected one also while paused outside its time, so it can be placed). */
function LayerViews({ layers, t, paused, styleId, custom, selected, onSelect, onMove, onResize }: {
  layers: TextLayer[]; t: number; paused: boolean; styleId: string; custom: CaptionCustom; selected: number;
  onSelect: (i: number) => void; onMove: (i: number, x: number, y: number) => void; onResize: (i: number, size: number) => void;
}) {
  return <>{layers.map((l, i) => {
    const on = t >= l.start && t < l.end;
    if (!on && !(paused && i === selected)) return null;
    const own = mergeCustom({ ...custom, highlight: "none" }, l.style);
    const words = l.text.split(/\s+/).filter(Boolean);
    return (
      <div key={i} className={`layer-view${i === selected ? " on" : ""}`} style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%` }}
        onPointerDown={(e) => { onSelect(i); dragIn(e, (x, y) => onMove(i, x, y)); }}>
        <StyledCaption styleId={styleId} custom={own} text={l.text} start={l.start} end={l.end} time={on ? t : l.end - 0.01} starts={words.map(() => l.start)} />
        {i === selected && <span className="rs-handle" title="Drag to resize" aria-hidden="true"
          onPointerDown={(e) => resizeFrom(e, resolveStyle(styleId, own).size ?? 1, 0.4, 2.6, 0.05, (s) => onResize(i, s))} />}
      </div>
    );
  })}</>;
}

/** Drag something over the player: report its centre as fractions of the frame. */
function dragIn(e: React.PointerEvent, onMove: (x: number, y: number) => void) {
  const frame = (e.currentTarget as HTMLElement).closest(".player")?.getBoundingClientRect();
  if (!frame) return;
  e.preventDefault();
  e.stopPropagation();
  follow(e, frame, onMove, 0.02);
}

/* ---------- centring guides ---------- */
/** What's being dragged or resized, for the guides; the player shows them meanwhile (class "guiding"). */
let guideTarget: HTMLElement | null = null;
const guideStart = (el: HTMLElement) => { guideTarget = el; el.closest(".player")?.classList.add("guiding"); };
const guideEnd = () => { guideTarget?.closest(".player")?.classList.remove("guiding"); guideTarget = null; };

/**
 * Centre lines, a ruler along the top and left edges, and a readout of where the caption (or whatever is being
 * dragged) sits: "Centred ✓" or how far off, and how far from the bottom. Shown while dragging or resizing, or
 * all the time when switched on. Measured every frame straight from the page (no re-rendering).
 */
function Guides({ on }: { on: boolean }) {
  const root = useRef<HTMLDivElement>(null), box = useRef<HTMLSpanElement>(null), read = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const g = root.current, player = g?.parentElement;
      if (!g || !player) return;
      const active = on || player.classList.contains("guiding");
      g.hidden = !active;
      if (!active) return;
      const target = guideTarget ?? player.querySelector<HTMLElement>(".overlay.styled .drag-handle");
      const f = player.getBoundingClientRect(), r = target?.getBoundingClientRect();
      if (!r || !r.width) { box.current!.hidden = true; read.current!.textContent = "No caption here"; g.classList.remove("cx"); return; }
      const cx = (r.left + r.width / 2 - f.left) / f.width, bottom = (f.bottom - r.bottom) / f.height;
      const off = cx - 0.5, centred = Math.abs(off) < 0.005;
      g.classList.toggle("cx", centred);
      Object.assign(box.current!.style, { left: `${((r.left - f.left) / f.width) * 100}%`, width: `${(r.width / f.width) * 100}%`, top: `${((r.top - f.top) / f.height) * 100}%`, height: `${(r.height / f.height) * 100}%` });
      box.current!.hidden = false;
      read.current!.textContent = `${centred ? "Centred ✓" : `${Math.abs(off * 100).toFixed(1)}% ${off < 0 ? "left" : "right"} of centre`} · ${Math.round(bottom * 100)}% from the bottom`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const ticks = Array.from({ length: 19 }, (_, i) => (i + 1) * 5);
  return (
    <div ref={root} className="guides" aria-hidden="true" hidden>
      <i className="g-v" /><i className="g-h" />
      <span className="g-ruler g-top">{ticks.map((t) => <b key={t} className={t % 25 ? "" : "major"} style={{ left: `${t}%` }}>{t % 25 ? "" : t}</b>)}</span>
      <span className="g-ruler g-left">{ticks.map((t) => <b key={t} className={t % 25 ? "" : "major"} style={{ top: `${t}%` }}>{t % 25 ? "" : t}</b>)}</span>
      <span ref={box} className="g-box" hidden />
      <span ref={read} className="g-read" />
    </div>
  );
}

/**
 * Move something placed by its centre (a caption, layer or logo) with the pointer: by how far the pointer moves, not
 * to where it is (grabbing a caption by its left end used to pull its centre there), only once it has moved a few
 * pixels (a click or a shaky tap leaves it where it is), and snapping to the middle of the frame when near it.
 */
function follow(e: React.PointerEvent, frame: DOMRect, onMove: (x: number, y: number) => void, edge: number) {
  const el = e.currentTarget as HTMLElement, box = el.getBoundingClientRect();
  const x0 = (box.left + box.width / 2 - frame.left) / frame.width, y0 = (box.top + box.height / 2 - frame.top) / frame.height;
  const sx = e.clientX, sy = e.clientY;
  let moving = false;
  const clamp = (n: number) => Math.min(1 - edge, Math.max(edge, n));
  const at = (ev: PointerEvent) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moving && Math.hypot(dx, dy) < 6) return;
    if (!moving) guideStart(el);
    moving = true;
    const x = x0 + dx / frame.width;
    onMove(clamp(Math.abs(x - 0.5) < 0.03 ? 0.5 : x), clamp(y0 + dy / frame.height));
  };
  const stop = () => { if (moving) guideEnd(); removeEventListener("pointermove", at); removeEventListener("pointerup", stop); };
  addEventListener("pointermove", at);
  addEventListener("pointerup", stop);
}

const tc = (s: number) => {
  const ms = Math.round(s * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};
/** Accepts "hh:mm:ss.mmm", "mm:ss.mmm" or plain seconds. */
const parseTc = (v: string) => {
  const n = v.trim().replace(",", ".").split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

export default function Editor({ initial, mediaUrl }: { initial: Job; mediaUrl?: string }) {
  const router = useRouter();
  const [job, setJob] = useState(initial);
  // Captions with undo/redo: `cues` is the present; past/future hold earlier and undone versions.
  const [cues, setCuesRaw] = useState<Cue[]>(initial.cues);
  const [past, setPast] = useState<Cue[][]>([]);
  const [future, setFuture] = useState<Cue[][]>([]);
  const dragFrom = useRef<Cue[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsgState] = useState("");
  const msgTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** A message under the toolbar; it clears itself (hints and errors after 6 s). */
  const setMsg = (m: string, ms = 6000) => { clearTimeout(msgTimer.current); setMsgState(m); if (m) msgTimer.current = setTimeout(() => setMsgState(""), ms); };
  const hasEnglish = initial.cues.some((c) => c.en);
  // A full English translation (English only at upload) keeps no spoken-language text: English is all there is.
  const hasSpoken = !hasEnglish || initial.cues.some((c) => c.ta);
  const views: View[] = !hasSpoken ? ["en"] : hasEnglish ? ["ta", "en", "both"] : ["ta"];
  // What the subtitles show (the project's choice from upload, changed with the buttons under the video): the
  // preview, the MP4 and the default download all follow it.
  const shown = initial.captionCustom?.show;
  const [view, setViewState] = useState<View>(!hasEnglish ? "ta" : !hasSpoken ? "en" : shown ?? "both");
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(Math.max(1, ...initial.cues.map((c) => c.end)));
  const [selected, setSelected] = useState(-1);
  const [selLayer, setSelLayer] = useState(-1);
  const [logoVer, setLogoVer] = useState(0); // bumps the logo image URL after an upload
  const bgVideo = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<Tab>("caption");
  const inBrowser = useSyncExternalStore(noop, () => true, () => false); // false while rendered on the server
  // A video still arriving after its sound: play the phone's own copy meanwhile (lib/videoUpload.ts).
  useSyncExternalStore(subscribeUploads, uploadsVersion, () => 0);
  const local = inBrowser ? localVideo(initial.id) : undefined;
  const src = mediaUrl ?? local?.url ?? (job.hasMedia ? `/api/jobs/${job.id}/media` : undefined);
  const videoHere = job.hasMedia || local?.state === "done"; // on the server (exports need it there)
  const coming = !videoHere && !!job.videoTotal;
  // Phones show one section at a time under the video (desktop shows them all).
  const [pane, setPane] = useState<Pane>("list");
  const [zoom, setZoom] = useState(80); // timeline px per second
  const [lang, setLang] = useState<View>(!hasEnglish ? "ta" : !hasSpoken ? "en" : shown ?? "both");
  const [fmt, setFmt] = useState("srt");
  const [styleId, setStyleId] = useState(initial.captionStyle || "minimal");
  const [custom, setCustom] = useState<CaptionCustom>(initial.captionCustom ?? {});
  const [portrait, setPortrait] = useState(false);
  const [ratio, setRatio] = useState(16 / 9);
  const [showZones, setShowZones] = useState(false);
  const [guides, setGuides] = useState(false); // centring guides kept on (they also show while dragging)
  // Editing on the video: the word picked in the strip, the caption's text open over the video, the timing nudges.
  const [pickedWord, setPickedWord] = useState<WordRef | null>(null);
  const [inline, setInline] = useState(false);
  const [nudging, setNudging] = useState(false);
  // Phones: the video fills the screen; the sections open as a sheet from the bottom, the video above it.
  const [sheet, setSheet] = useState(false);
  const language = languageOf(job.language);
  const short = shortCode(job.language);
  const tamil = short === "ta" || initial.cues.some((c) => /[\u0B80-\u0BFF]/.test(c.ta)); // Tamil letters get their own font
  const video = useRef<HTMLVideoElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const line: "ta" | "en" = view === "en" ? "en" : "ta"; // the line words and the timeline follow

  /** A change that is one undo step. */
  const commit = useCallback((next: Cue[]) => {
    setPast((p) => [...p.slice(-199), cues]);
    setFuture([]);
    setCuesRaw(next);
    setDirty(true);
  }, [cues]);
  const undo = () => { if (!past.length) return; setFuture((f) => [cues, ...f]); setCuesRaw(past[past.length - 1]); setPast((p) => p.slice(0, -1)); setDirty(true); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, cues]); setCuesRaw(future[0]); setFuture((f) => f.slice(1)); setDirty(true); };
  const editCue = (i: number, next: Cue) => commit(cues.map((c, j) => (j === i ? next : c)));

  // Poll until processing finishes.
  useEffect(() => {
    if (job.status === "done" || job.status === "failed") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (!res.ok) return;
      const j: Job = await res.json();
      setJob(j);
      if (j.status === "done") setCuesRaw(j.cues);
    }, 3000);
    return () => clearInterval(t);
  }, [job.id, job.status]);

  // Poll while a styled MP4 renders.
  const rendering = job.renderStatus === "queued" || job.renderStatus === "rendering";
  useEffect(() => {
    if (!rendering) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (res.ok) { const j: Job = await res.json(); setJob((old) => ({ ...old, renderStatus: j.renderStatus, renderProgress: j.renderProgress, renderError: j.renderError })); }
    }, 2000);
    return () => clearInterval(t);
  }, [job.id, rendering]);

  const saveLook = (body: object) =>
    fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  // A new style starts from its own look; the project's layers, logo, canvas, safe zone, languages and lines stay.
  /** Every caption back on the project's look (one undo step). */
  const ownLooks = cues.filter((c) => c.style).length;
  function sameLook() {
    if (ownLooks) commit(cues.map((c) => { if (!c.style) return c; const out = { ...c }; delete out.style; return out; }));
  }
  // A new style is for every caption: the ones with their own look take it too.
  function pickStyle(id: string) {
    sameLook();
    const kept = projectOnly(custom);
    setStyleId(id);
    setCustom(kept);
    savedLook.current = JSON.stringify(kept);
    saveLook({ captionStyle: id, captionCustom: kept });
  }
  const savedLook = useRef(JSON.stringify(initial.captionCustom ?? {}));
  useEffect(() => {
    const now = JSON.stringify(custom);
    if (now === savedLook.current) return; // only real changes are saved
    const t = setTimeout(() => { savedLook.current = now; saveLook({ captionCustom: custom }); }, 400);
    return () => clearTimeout(t);
  }, [custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const tweak = (patch: CaptionCustom) => setCustom((c) => ({ ...c, ...patch }));
  // Look changes go to every caption unless "Only this caption" is picked.
  const [onlyThis, setOnlyThis] = useState(false);
  const setView = (v: View) => { setViewState(v); setLang(v); tweak({ show: v }); };
  const look = resolveStyle(styleId, custom, portrait);
  const layers = custom.layers ?? [];
  const setLayers = (next: TextLayer[]) => tweak({ layers: next });
  const editLayer = (i: number, patch: Partial<TextLayer>) => setLayers(layers.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  function addLayer(text: string) {
    const start = Math.max(0, Math.min(now, duration - 0.5));
    setLayers([...layers, { text, start, end: Math.min(duration, start + 3), x: 0.5, y: text.length <= 3 ? 0.4 : 0.25 }]);
    setSelLayer(layers.length);
    setTab("layers");
  }
  async function uploadLogo(file: File) {
    const res = await fetch(`/api/jobs/${job.id}/logo`, { method: "POST", headers: { "content-type": file.type }, body: file });
    const r = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(r.error || "Couldn't upload the logo."); return; }
    setCustom((c) => ({ ...c, logo: r.logo })); // the look autosave stores the same logo again
    setLogoVer((v) => v + 1);
  }
  async function removeLogo() {
    await fetch(`/api/jobs/${job.id}/logo`, { method: "DELETE" }).catch(() => {});
    setCustom((c) => { const n = { ...c }; delete n.logo; return n; });
  }
  const cv = custom.canvas, shaped = !!cv && cv.ratio !== "source";
  const frameRatio = shaped ? RATIO[cv!.ratio as keyof typeof RATIO] : ratio;
  const hex = (c: string | undefined, fallback: string) => (c ?? fallback).slice(0, 7);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cues }) });
    setSaving(false);
    if (res.ok) { setDirty(false); setMsg("Saved", 2000); }
    else setMsg((await res.json().catch(() => ({}))).error || "Couldn't save. Try again.");
    return res.ok;
  }

  async function render() {
    if (dirty && !(await save())) return;
    await saveLook({ captionStyle: styleId, captionCustom: custom });
    const res = await fetch(`/api/jobs/${job.id}/render`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ style: styleId, lang: view }) });
    if (res.ok) setJob((j) => ({ ...j, renderStatus: "queued", renderProgress: 0, renderError: null, renderLang: view, captionStyle: styleId }));
    else setMsg((await res.json().catch(() => ({}))).error || "Couldn't start the render.");
  }

  // ---------- playback ----------
  /** The video's shape and length (the preview and timeline match it). */
  function metadata(v: HTMLVideoElement) {
    setPortrait(v.videoHeight > v.videoWidth);
    if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
    if (v.duration) setDuration(v.duration);
  }
  // The blurred background copy (canvas "fit" on blur) follows the main video.
  useEffect(() => {
    const b = bgVideo.current;
    if (!b) return;
    if (Math.abs(b.currentTime - now) > 0.3) b.currentTime = now;
    if (playing && b.paused) b.play().catch(() => {});
    if (!playing && !b.paused) b.pause();
  }, [now, playing]);
  // The video can be ready before this page's scripts are: then loadedmetadata already fired.
  useEffect(() => { const v = video.current; if (v && v.readyState >= 1) metadata(v); }, []);
  const seek = (t: number) => { const v = video.current; if (v) v.currentTime = Math.max(0, Math.min(t, (v.duration || duration) - 0.01)); setNow(t); };
  const togglePlay = () => { const v = video.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const activeIdx = cues.findIndex((c) => now >= c.start && now < c.end);
  useEffect(() => {
    if (activeIdx < 0 || !playing) return;
    list.current?.children[activeIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx, playing]);
  // Timing check: captions that don't line up with the speech, or are far faster or slower than the rest (lib/timing.ts).
  // A translation isn't what's said: check the English (what's said) instead.
  const checkLine = hasSpoken && initial.script !== "translated" ? "ta" : "en";
  const issues = useMemo(() => timingIssues(cues, initial.speech ?? [], checkLine), [cues, initial.speech, checkLine]);
  const issueOf = new Map(issues.filter((x) => x.cue >= 0).map((x) => [x.cue, x]));
  function nextIssue() {
    const x = issues.find((x) => x.at > now + 0.6) ?? issues[0];
    if (!x) return;
    if (x.cue >= 0) select(x.cue);
    seek(Math.max(0, x.at - 0.5));
    setMsg(ISSUE_TEXT[x.kind]);
  }
  const [retype, setRetype] = useState<{ type: CaptionType; withEnglish: boolean } | null>(null);
  const [retyping, setRetyping] = useState(false);
  async function applyType() {
    if (!retype) return;
    setRetyping(true);
    const res = await fetch(`/api/jobs/${initial.id}/redo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(retype) });
    const r = await res.json().catch(() => ({}));
    setRetyping(false);
    if (!res.ok) { setRetype(null); setMsg(r.error || "Couldn't change the caption type."); return; }
    setDirty(false);
    if (r.redone) router.push("/app"); // the projects page shows the progress
    else setTimeout(() => window.location.reload(), 50); // after the unsaved-changes guard is off
  }
  /** Phones: show one section; the inspector ones open their tab (Edit opens the caption under the playhead). */
  function openPane(k: Pane) {
    setPane(k);
    setSheet(true);
    setTimeout(() => document.querySelectorAll(".ed-side, .ed-list, .ed-timeline").forEach((e) => { e.scrollTop = 0; }), 0); // each section opens at its top
    if (k === "caption" || k === "style" || k === "layers" || k === "export") setTab(k);
    if (k === "caption" && selected < 0 && activeIdx >= 0) setSelected(activeIdx);
  }
  function select(i: number) {
    setSelected(i);
    if (i >= 0) { setTab("caption"); list.current?.children[i]?.scrollIntoView({ block: "nearest" }); }
  }

  // ---------- caption operations ----------
  const target = () => (selected >= 0 ? selected : activeIdx);
  function split() {
    const i = cues.findIndex((c) => now > c.start && now < c.end);
    const parts = i >= 0 ? splitCue(cues[i], now) : undefined;
    if (!parts) { setMsg("Put the playhead inside a caption with two or more words to split it."); return; }
    commit([...cues.slice(0, i), ...parts, ...cues.slice(i + 1)]);
    setSelected(i + 1);
  }
  function merge() {
    const i = target();
    if (i < 0 || i + 1 >= cues.length) { setMsg("Select a caption that has another one after it to merge them."); return; }
    commit([...cues.slice(0, i), mergeCues(cues[i], cues[i + 1]), ...cues.slice(i + 2)]);
    setSelected(i);
  }
  function add() {
    const r = insertAt(cues, now, duration);
    if (r.index < 0) { setMsg("No room for a new caption at the playhead. Move the playhead to a gap."); return; }
    commit(r.cues);
    select(r.index);
    setTimeout(() => (document.getElementById("cap-text") as HTMLTextAreaElement | null)?.focus(), 0);
  }
  function remove(i = target()) {
    if (i < 0) return;
    commit(cues.filter((_, j) => j !== i));
    setSelected(Math.min(i, cues.length - 2));
  }
  /**
   * Change the look of every caption: the project's look, and the same settings taken off any caption that had its
   * own (else that caption would keep showing its old value and the change would seem to reach only some captions).
   */
  function lookAll(patch: CaptionCustom) {
    tweak(patch);
    const keys = Object.keys(patch) as (keyof CaptionCustom)[];
    if (!cues.some((c) => c.style && keys.some((k) => k in c.style!))) return;
    commit(cues.map((c) => {
      if (!c.style || !keys.some((k) => k in c.style!)) return c;
      const st = { ...c.style };
      for (const k of keys) delete st[k];
      const out: Cue = { ...c };
      if (Object.keys(st).length) out.style = st; else delete out.style;
      return out;
    }));
  }
  /** Change the selected caption's own look; an empty look falls back to the project's. */
  function styleCue(i: number, patch: CaptionCustom | null) {
    const c = cues[i];
    const next = patch === null ? undefined : { ...c.style, ...patch };
    if (next) for (const k of Object.keys(next) as (keyof CaptionCustom)[]) if (next[k] === undefined) delete next[k];
    const out: Cue = { ...c };
    if (next && Object.keys(next).length) out.style = next; else delete out.style;
    editCue(i, out);
  }

  // ---------- editing on the video ----------
  /** The word of caption i at time t (the one being said). */
  const wordAt = (i: number, t: number) => { const st = startsOf(cues[i], line); let j = 0; while (j + 1 < st.length && st[j + 1] <= t + 0.01) j++; return j; };
  /** A caption tapped on the video: pick it (by its time: the English view groups captions differently). */
  function tapCaption(start: number) {
    const t = Math.max(start, now);
    let i = cues.findIndex((c) => t >= c.start - 0.01 && t < c.end);
    if (i < 0) i = cues.findIndex((c) => c.end > start);
    if (i < 0) return;
    if (i !== selected) { setInline(false); setNudging(false); }
    select(i);
    setPickedWord({ cue: i, j: wordAt(i, Math.max(now, cues[i].start)) });
  }
  function pickWord(w: WordRef, start: number) {
    video.current?.pause();
    seek(start + 0.01);
    if (w.cue !== selected) { setInline(false); setNudging(false); }
    select(w.cue);
    setPickedWord(w);
  }
  const editWord = (w: WordRef, text: string) => { editCue(w.cue, setWord(cues[w.cue], line, w.j, { text })); setPickedWord(null); };
  /** Make the picked word pop (the style's accent colour), or back to normal. */
  /** The caption the tools under the video work on: the selected one, else the one under the playhead (selected then). */
  function current() {
    if (selected >= 0) return selected;
    if (activeIdx >= 0) setSelected(activeIdx);
    return activeIdx;
  }
  function highlight() {
    const i = current();
    if (i < 0) return;
    const c = cues[i];
    const j = pickedWord?.cue === i ? pickedWord.j : wordAt(i, now);
    if (!wordsOf(c[line])[j]) return;
    const has = !!(line === "en" ? c.wce : c.wc)?.[j];
    editCue(i, setWord(c, line, j, { color: has ? null : custom.accent ?? "#FFD60A" }));
  }
  /** Move the selected caption's start or end by d seconds (not over its neighbours, at least 0.2 s long). */
  function nudge(edge: "start" | "end", d: number) {
    const i = target(), c = cues[i];
    if (!c) return;
    if (edge === "start") editCue(i, { ...c, start: Math.max(cues[i - 1]?.end ?? 0, Math.min(c.start + d, c.end - 0.2)) });
    else editCue(i, { ...c, end: Math.min(cues[i + 1]?.start ?? duration, Math.max(c.end + d, c.start + 0.2)) });
  }
  function inlineDone(text: string | null) {
    setInline(false);
    const i = target(), c = cues[i];
    if (text !== null && c && text.trim() !== c[line]) editCue(i, setText(c, line, text.trim()));
  }

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); if (dirty) save(); return; }
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (typing(e) || mod || e.altKey) return;
      const k = e.key;
      if (k === " ") { e.preventDefault(); togglePlay(); }
      else if (k === "s" || k === "S") split();
      else if (k === "m" || k === "M") merge();
      else if (k === "a" || k === "A") add();
      else if (k === "Delete" || k === "Backspace") { e.preventDefault(); remove(); }
      else if (k === "ArrowLeft") { e.preventDefault(); seek(now - (e.shiftKey ? 1 : FRAME)); }
      else if (k === "ArrowRight") { e.preventDefault(); seek(now + (e.shiftKey ? 1 : FRAME)); }
      else if (k === "ArrowUp" || k === "ArrowDown") {
        e.preventDefault();
        const i = Math.max(0, Math.min(cues.length - 1, (selected < 0 ? activeIdx : selected) + (k === "ArrowUp" ? -1 : 1)));
        if (cues[i]) { select(i); seek(cues[i].start); }
      }
      else if (k === "+" || k === "=") setZoom((z) => Math.min(600, z * 1.25));
      else if (k === "-" || k === "_") setZoom((z) => Math.max(10, z / 1.25));
      else if (k === "g" || k === "G") setGuides((g) => !g);
      else if (k === "Escape") { setSelected(-1); setPickedWord(null); setNudging(false); }
      else if (k === "Enter" && target() >= 0) { e.preventDefault(); video.current?.pause(); current(); setInline(true); }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    addEventListener("keydown", onKey);
    addEventListener("beforeunload", onLeave);
    return () => { removeEventListener("keydown", onKey); removeEventListener("beforeunload", onLeave); };
  });

  async function del() {
    if (!confirm("Delete this project and its video? This can't be undone.")) return;
    const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    if (res.ok) { router.replace("/app"); router.refresh(); }
    else setMsg((await res.json().catch(() => ({}))).error || "Couldn't delete.");
  }

  if (job.status !== "done") {
    return (
      <div className="editor-wait panel">
        <Link href="/app" className="muted">Projects</Link>
        <h1>{job.filename}</h1>
        {job.status === "failed" ? (
          <>
            <p className="error">We couldn&apos;t subtitle this video: {job.error}</p>
            <p className="muted">The minutes were added back to your balance. Try uploading it again.</p>
            <button className="btn danger small" onClick={del}>Delete project</button>
          </>
        ) : (
          <>
            <SubtitleReveal src={src} progress={job.progress} queued={job.status === "queued"} />
            <div className="bar big" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(job.progress, 3)}%` }} /></div>
            <p className="muted">{job.status === "queued" ? "Waiting in line…" : `${job.progress}% done.`} You can leave this page; we&apos;ll keep working.</p>
          </>
        )}
      </div>
    );
  }

  const sel = cues[selected];
  const selLook = sel ? resolveStyle(styleId, mergeCustom(custom, sel.style), portrait) : look;
  const words = sel ? wordsOf(sel[line]) : [];
  const starts = sel ? startsOf(sel, line) : [];
  const colors = sel ? (line === "en" ? sel.wce : sel.wc) : undefined;
  const own = sel?.style ?? {};

  return (
    <div className="editor ed" data-pane={pane} data-sheet={sheet || undefined}>
      <div className="ed-top">
        <div className="ed-title">
          <Link href="/app" className="muted">Projects</Link>
          <h1 className="page-title">{job.filename}</h1>
          <button className="ctype-chip" onClick={() => setRetype(typeOf(initial))} title="Change what the captions say and how they're written">
            <span className="muted">Captions:</span> <strong>{typeLabel(initial, language.name)}</strong> <span className="ctype-go">Change type</span>
          </button>
        </div>
        {retype && createPortal(
          <div className="modal-back" onClick={(e) => e.target === e.currentTarget && !retyping && setRetype(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-label="Change caption type">
              <h2>Change caption type</h2>
              <CaptionTypePicker language={language.name} tamil={short === "ta"} type={retype.type} withEnglish={retype.withEnglish}
                onChange={(type, withEnglish) => setRetype({ type, withEnglish })} disabled={retyping} />
              <p className="muted small">
                Some changes are instant (like hiding the English line). Others make the captions again from your video:
                that takes a minute or two, uses no minutes, and replaces your text edits (your style stays).
                {` ${Math.max(0, MAX_REDOS - initial.redos)} of ${MAX_REDOS} remakes left.`}{dirty ? " Unsaved changes will be lost." : ""}
              </p>
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setRetype(null)} disabled={retyping}>Cancel</button>
                <button className="btn" onClick={applyType} disabled={retyping}>{retyping ? "Changing…" : "Change"}</button>
              </div>
            </div>
          </div>, document.body, // on the page itself: a sticky or animated parent would trap a fixed dialog off-screen
        )}
        <div className="ed-tools" role="toolbar" aria-label="Edit">
          <button className="btn ghost small" onClick={undo} disabled={!past.length} title="Undo (⌘Z)">Undo</button>
          <button className="btn ghost small" onClick={redo} disabled={!future.length} title="Redo (⇧⌘Z)">Redo</button>
          <span className="muted save-msg" aria-live="polite">{msg || (dirty ? "Unsaved changes" : "All changes saved")}{local?.state === "sending" ? ` · Video uploading ${progressOf(local)}%` : ""}</span>
          <button className="btn" onClick={save} disabled={!dirty || saving} title="Save (⌘S)">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>

      <div className="ed-main">
        <ol className="cues ed-list" ref={list} aria-label="Captions">
          {cues.map((c, i) => (
            <li key={i} className={`${i === activeIdx ? "on" : ""}${i === selected ? " sel" : ""}`} onClick={() => select(i)}>
              <div className="times">
                <button className="seek" onClick={(e) => { e.stopPropagation(); select(i); seek(c.start); video.current?.play().catch(() => {}); }} title="Play from here" aria-label={`Play from ${tc(c.start)}`}>
                  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M1 1l8 5-8 5z" fill="currentColor" /></svg>
                </button>
                <span className="muted small tnum">{tc(c.start)} → {tc(c.end)}</span>
                {c.style && <span className="chip-own" title="This caption has its own style">Own style</span>}
                {issueOf.has(i) && <span className="chip-timing" title={ISSUE_TEXT[issueOf.get(i)!.kind]}>Check timing</span>}
              </div>
              {hasSpoken && <textarea lang={short} rows={1} value={c.ta} onChange={(e) => editCue(i, setText(c, "ta", e.target.value))} aria-label={`${language.name} subtitle ${i + 1}`} />}
              {hasEnglish && <textarea rows={1} value={c.en} onChange={(e) => editCue(i, setText(c, "en", e.target.value))} aria-label={`English subtitle ${i + 1}`} />}
            </li>
          ))}
          {cues.length === 0 && (
            <li className="empty-cues">
              <p className="muted">No speech was found in this video.</p>
              <button className="btn ghost small" onClick={add}>Add a subtitle</button>
            </li>
          )}
        </ol>

        <div className="ed-stage">
          <div className="ed-ibar" role="toolbar" aria-label="Editor">
            <Link href="/app" className="ib-round" aria-label="Back to projects"><Icon name="back" /></Link>
            <button className="ib-round" onClick={undo} disabled={!past.length} aria-label="Undo"><Icon name="undo" /></button>
            <button className="ib-round" onClick={redo} disabled={!future.length} aria-label="Redo"><Icon name="redo" /></button>
            <span className="ib-gap" />
            {local?.state === "sending" && <span className="ib-up" title="The video is uploading; you can edit meanwhile">Video {progressOf(local)}%</span>}
            <button className={`ib-save${dirty ? " on" : ""}`} onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : dirty ? "Save" : "Saved"}</button>
            <button className="ib-export" onClick={() => openPane("export")}>Export</button>
          </div>
          <div className="ed-frame">
          {!playing && !sheet && (
            <div className="vrail vrail-phone" role="toolbar" aria-label="Add and change">
              <button onClick={() => { addLayer("Your text"); openPane("layers"); }}><Icon name="title" />Add title</button>
              <button onClick={() => openPane("style")}><Icon name="style" />Caption style</button>
              <button onClick={() => setRetype(typeOf(initial))}><Icon name="lang" />Translate</button>
              <button onClick={() => setGuides((g) => !g)} aria-pressed={guides} title="Centring guides"><Icon name="guides" />Guides</button>
              {views.length > 1 && (
                <button onClick={() => setView(views[(views.indexOf(view) + 1) % views.length])} title="Which language the captions show (tap to change)">
                  <span className="vr-glyph" aria-hidden="true">அA</span>{view === "ta" ? language.native : view === "en" ? "English" : "Both"}
                </button>
              )}
            </div>
          )}
          {src ? (
            <div className="player" style={{ aspectRatio: frameRatio, "--ar": frameRatio, width: `min(100%, ${(56 * frameRatio).toFixed(2)}vh)`, background: shaped && cv!.fit === "fit" && cv!.bg !== "blur" ? cv!.bg : undefined } as React.CSSProperties}>
              {shaped && cv!.fit === "fit" && cv!.bg === "blur" && <video ref={bgVideo} className="bg-blur" src={src} muted playsInline preload="metadata" aria-hidden="true" />}
              <video ref={video} src={src} preload="metadata" playsInline onClick={togglePlay} style={shaped ? { objectFit: cv!.fit === "fill" ? "cover" : "contain" } : undefined}
                onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                onLoadedMetadata={(e) => metadata(e.currentTarget)} />
              <Guides on={guides} />
              {showZones && (["top", "right", "bottom", "left"] as const).map((k) => <i key={k} className={`zone zone-${k}`} style={{ [k === "top" || k === "bottom" ? "height" : "width"]: `${look.safe[k] * 100}%` }} />)}
              <LayerViews layers={layers} t={now} paused={!playing} styleId={styleId} custom={custom} selected={tab === "layers" ? selLayer : -1}
                onSelect={(i) => { setSelLayer(i); setTab("layers"); }} onMove={(i, x, y) => editLayer(i, { x, y })}
                onResize={(i, size) => editLayer(i, { style: { ...layers[i].style, size } })} />
              {custom.logo && (
                <div className={`logo-view${tab === "layers" ? " on" : ""}`}
                  style={{ left: `${custom.logo.x * 100}%`, top: `${custom.logo.y * 100}%`, width: `${custom.logo.size * 100}%`, opacity: custom.logo.opacity }}
                  onPointerDown={(e) => { setTab("layers"); dragIn(e, (x, y) => tweak({ logo: { ...custom.logo!, x, y } })); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Logo" src={`/api/jobs/${job.id}/logo?v=${logoVer}`} draggable={false}
                    onError={() => { if (logoVer < 3) setTimeout(() => setLogoVer((v) => v + 1), 800); }} />
                  {/* the dot on the left corner when the right one would be off the video */}
                  {tab === "layers" && <span className={`rs-handle${custom.logo.x + custom.logo.size / 2 > 0.95 ? " rs-left" : ""}`} title="Drag to resize" aria-hidden="true"
                    onPointerDown={(e) => resizeFrom(e, custom.logo!.size, 0.03, 0.6, 0.005, (size) => tweak({ logo: { ...custom.logo!, size } }))} />}
                </div>
              )}
              {!playing && (
                <>
                  <button className="play-big" onClick={togglePlay} aria-label="Play"><Icon name="play" /></button>
                  <div className="vrail vrail-desk" role="toolbar" aria-label="Add and change">
                    <button onClick={() => { addLayer("Your text"); openPane("layers"); }} title="Add a title"><Icon name="title" />Add title</button>
                    <button onClick={() => { openPane("style"); document.querySelector(".ed-side")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }} title="Caption style"><Icon name="style" />Caption style</button>
                    <button onClick={() => setRetype(typeOf(initial))} title="Caption type: language and script"><Icon name="lang" />Caption type</button>
                    <button onClick={() => setGuides((g) => !g)} aria-pressed={guides} title="Centring guides (G)"><Icon name="guides" />Guides</button>
                  </div>
                </>
              )}
              <LiveCaption video={video} cues={view === "en" && cues.some((c) => c.ta) ? englishCues(cues) : cues} styleId={styleId} custom={custom} portrait={portrait} view={view} selected={selected}
                // The picked caption gets a dashed box (in the English view captions are regrouped: the one holding it).
                picked={(start) => !playing && !!sel && (view === "en" ? start <= sel.start + 0.01 && now >= sel.start - 0.01 && now < sel.end : Math.abs(start - sel.start) < 0.001)}
                editing={inline && cues[target()] ? cues[target()][line] : null}
                onTap={tapCaption} onEditOpen={() => { setInline(true); }} onEditDone={inlineDone}
                onMove={(i, x, y) => { if (onlyThis && i === selected) styleCue(i, { x, y }); else lookAll({ x, y }); }}
                onResize={(i, size) => { if (onlyThis && i === selected) styleCue(i, { size }); else lookAll({ size }); }} />
            </div>
          ) : (
            coming ? (
              // The page was reopened before the video finished: the same file finishes it (from where it stopped).
              <div className="player gone"><p>The video didn&apos;t finish uploading. Choose the same file to finish it; the captions are ready.</p>
                <label className="btn small">Choose the video<input type="file" hidden accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendVideo(job.id, f); }} /></label>
                {local?.state === "failed" && <p className="error">{local.error}</p>}
              </div>
            ) : <div className="player gone"><p>The video was removed after 7 days. Your subtitles are still here.</p></div>
          )}
          </div>
          {!playing && target() >= 0 && (
            <div className="vtools" role="toolbar" aria-label="This caption">
              {nudging ? (
                <>
                  <span className="vt-label">Start <b className="tnum">{tc(sel.start).slice(3)}</b></span>
                  <button onClick={() => nudge("start", -0.1)} aria-label="Start 0.1 s earlier">−0.1</button>
                  <button onClick={() => nudge("start", 0.1)} aria-label="Start 0.1 s later">+0.1</button>
                  <span className="vt-label">End <b className="tnum">{tc(sel.end).slice(3)}</b></span>
                  <button onClick={() => nudge("end", -0.1)} aria-label="End 0.1 s earlier">−0.1</button>
                  <button onClick={() => nudge("end", 0.1)} aria-label="End 0.1 s later">+0.1</button>
                  <button className="vt-done" onClick={() => setNudging(false)}>Done</button>
                </>
              ) : (
                <>
                  <button onClick={() => { current(); setInline(true); }}><Icon name="text" />Edit text</button>
                  <button onClick={highlight}><Icon name="mark" />Highlight</button>
                  <button onClick={() => { current(); setNudging(true); }}><Icon name="clock" />Timing</button>
                  <button onClick={() => remove(target())}><Icon name="delete" />Delete</button>
                  <button className="vt-more" onClick={split}><Icon name="split" />Split</button>
                  <button className="vt-more" onClick={merge}><Icon name="merge" />Merge</button>
                  <button className="vt-more" onClick={add}><Icon name="add" />Add</button>
                </>
              )}
            </div>
          )}
          <WordStrip cues={cues} line={line} now={now} picked={pickedWord} lang={line === "ta" ? short : "en"} onPick={pickWord} onEdit={editWord} />
          <div className="ed-transport" role="toolbar" aria-label="Playback and editing">
            <button className="btn small" onClick={togglePlay} title="Play / pause (Space)">{playing ? "Pause" : "Play"}</button>
            <span className="tnum ed-time"><span className="t-long">{tc(now)} / {tc(duration)}</span><span className="t-short">{mmss(now)} / {mmss(duration)}</span></span>
            <span className="ed-sep" />
            <button className="btn ghost small ed-act" onClick={split} title="Split the caption at the playhead (S)">Split</button>
            <button className="btn ghost small ed-act" onClick={merge} title="Merge the selected caption with the next (M)">Merge</button>
            <button className="btn ghost small ed-act" onClick={add} title="Add a caption at the playhead (A)">Add</button>
            <button className="btn ghost small ed-act" onClick={() => remove()} disabled={target() < 0} title="Delete the selected caption (Delete)">Delete</button>
            {issues.length > 0 && <button className="btn ghost small timing-next" onClick={nextIssue} title="Go to the next caption whose timing may be off">Check timing · {issues.length}</button>}
            {views.length > 1 && <>
              <span className="ed-sep" />
              <div className="seg" role="group" aria-label="Preview language">
                {views.map((v) => (
                  <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "ta" ? language.native : v === "en" ? "English" : "Both"}</button>
                ))}
              </div>
            </>}
          </div>
          <div className="ed-sheethead">
            <strong>{({ list: "Captions", caption: "Edit caption", timeline: "Timeline", style: "Caption style", layers: "Titles and logo", export: "Export" } as Record<Pane, string>)[pane]}</strong>
            <button onClick={() => setSheet(false)}>Done</button>
          </div>
          <nav className="ed-mnav" aria-label="Editor sections">
            {PANES.map(([k, l]) => (
              <button key={k} aria-pressed={pane === k} onClick={() => openPane(k)}>{l}</button>
            ))}
            <button className="ed-mdone" onClick={() => setSheet(false)}>Done</button>
          </nav>
        </div>

        <aside className="ed-side">
          <div className="seg ed-tabs" role="tablist" aria-label="Inspector">
            {([["caption", "Caption"], ["layers", "Layers"], ["style", "Style"], ["export", "Export"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="ed-side-body">{/* scrolls under the tabs, which stay put */}

          {tab === "caption" && (sel ? (
            <div className="insp">
              <div className="insp-row">
                <TimeInput key={`s${selected}-${sel.start}`} value={sel.start} label="Start" onChange={(v) => { const prev = cues[selected - 1]; const s = Math.max(prev ? prev.end : 0, Math.min(v, sel.end - 0.2)); editCue(selected, { ...sel, start: s }); }} />
                <TimeInput key={`e${selected}-${sel.end}`} value={sel.end} label="End" onChange={(v) => { const next = cues[selected + 1]; const en = Math.min(next ? next.start : duration, Math.max(v, sel.start + 0.2)); editCue(selected, { ...sel, end: en }); }} />
                <span className="muted small">{(sel.end - sel.start).toFixed(2)} s</span>
              </div>
              {hasSpoken && <label className="insp-field">{language.name}
                <textarea id="cap-text" lang={short} rows={2} value={sel.ta} onChange={(e) => editCue(selected, setText(sel, "ta", e.target.value))} />
              </label>}
              {hasEnglish && <label className="insp-field">English<textarea rows={2} value={sel.en} onChange={(e) => editCue(selected, setText(sel, "en", e.target.value))} /></label>}

              <div className="insp-head">
                <h3>Look</h3>
                {onlyThis && <button className="btn ghost small" onClick={() => styleCue(selected, null)} disabled={!sel.style}>Use project style</button>}
              </div>
              {/* Every caption by default: changing one caption's look is the exception, picked on purpose. */}
              <div className="seg look-scope" role="group" aria-label="Apply look changes to">
                <button aria-pressed={!onlyThis} onClick={() => setOnlyThis(false)}>All captions</button>
                <button aria-pressed={onlyThis} onClick={() => setOnlyThis(true)}>Only this caption</button>
              </div>
              <p className="muted small">{onlyThis ? "Changes here, and dragging or resizing this caption on the video, change only this caption." : "Changes here, and dragging or resizing a caption on the video, change every caption."}</p>
              {onlyThis
                ? <LookControls look={selLook} own={own} set={(patch) => styleCue(selected, patch)} tamil={tamil} project={look} />
                : <LookControls look={look} own={custom} set={lookAll} tamil={tamil} />}

              <h3>Words</h3>
              <p className="muted small">Edit a word, its start time (or drag it on the timeline) and its colour.</p>
              <ol className="insp-words">
                {words.map((w, j) => (
                  <li key={`${selected}-${j}-${w}`}>
                    <input className="w-text" lang={line === "ta" ? short : "en"} defaultValue={w} aria-label={`Word ${j + 1}`}
                      onBlur={(e) => { if (e.target.value !== w) editCue(selected, setWord(sel, line, j, { text: e.target.value })); }} />
                    <TimeInput key={`w${selected}-${j}-${starts[j]}`} value={starts[j]} label={`Word ${j + 1} start`} onChange={(v) => editCue(selected, setWord(sel, line, j, { start: v }))} />
                    <input type="color" aria-label={`Word ${j + 1} colour`} value={hex(colors?.[j] ?? undefined, hex(selLook.color, "#ffffff"))} onChange={(e) => editCue(selected, setWord(sel, line, j, { color: e.target.value }))} />
                    {colors?.[j] && <button className="link small" onClick={() => editCue(selected, setWord(sel, line, j, { color: null }))}>Reset</button>}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="insp">
              <p className="muted">Select a caption in the list or on the timeline to edit its text, timing, look and words.</p>
              <ShortcutHelp />
            </div>
          ))}

          {tab === "layers" && (
            <div className="insp">
              <h3>Text layers</h3>
              <p className="muted small">Text or emoji over the video for as long as you like. Drag it on the video to place it, and on the timeline&apos;s lower row to time it.</p>
              <div className="insp-actions">
                <button className="btn small" onClick={() => addLayer("Your text")}>Add text</button>
              </div>
              <div className="emoji-row" role="group" aria-label="Add an emoji">
                {EMOJIS.map((e) => <button key={e} onClick={() => addLayer(e)} title={`Add ${e}`}>{e}</button>)}
              </div>
              <p className="muted small">Emojis come out in one colour (the text colour) in the exported video.</p>
              {layers.length > 0 && (
                <ol className="layer-list">
                  {layers.map((l, i) => (
                    <li key={i} className={i === selLayer ? "on" : ""} onClick={() => { setSelLayer(i); seek(l.start); }}>
                      <span className="tnum small">{l.text.slice(0, 28) || "…"} <span className="muted">· {tc(l.start).slice(3, 8)}–{tc(l.end).slice(3, 8)}</span></span>
                      <button className="link small" onClick={(e) => { e.stopPropagation(); setLayers(layers.filter((_, j) => j !== i)); setSelLayer(-1); }}>Delete</button>
                    </li>
                  ))}
                </ol>
              )}
              {layers[selLayer] && (() => {
                const l = layers[selLayer];
                return (
                  <>
                    <label className="insp-field">Text<textarea rows={2} value={l.text} onChange={(e) => editLayer(selLayer, { text: e.target.value })} /></label>
                    <div className="insp-row">
                      <TimeInput key={`ls${selLayer}-${l.start}`} value={l.start} label="Start" onChange={(v) => editLayer(selLayer, { start: Math.max(0, Math.min(v, l.end - 0.2)) })} />
                      <TimeInput key={`le${selLayer}-${l.end}`} value={l.end} label="End" onChange={(v) => editLayer(selLayer, { end: Math.min(duration, Math.max(v, l.start + 0.2)) })} />
                    </div>
                    <div className="insp-head">
                      <h3>This layer&apos;s look</h3>
                      <button className="btn ghost small" onClick={() => editLayer(selLayer, { style: undefined })} disabled={!l.style}>Use project style</button>
                    </div>
                    <LookControls look={resolveStyle(styleId, mergeCustom(custom, { ...l.style, x: l.x, y: l.y }), portrait)} own={l.style ?? {}} tamil={tamil} project={look}
                      set={(patch) => { const st = { ...l.style, ...patch }; delete st.x; delete st.y; delete st.position; editLayer(selLayer, { style: st }); }} />
                  </>
                );
              })()}

              <h3>Logo or watermark</h3>
              {custom.logo ? (
                <>
                  <label>Size <span className="cz-val">{Math.round(custom.logo.size * 100)}%</span>
                    <input type="range" min={0.03} max={0.6} step={0.01} value={custom.logo.size} onChange={(e) => tweak({ logo: { ...custom.logo!, size: +e.target.value } })} />
                  </label>
                  <label>Opacity <span className="cz-val">{Math.round(custom.logo.opacity * 100)}%</span>
                    <input type="range" min={0.1} max={1} step={0.05} value={custom.logo.opacity} onChange={(e) => tweak({ logo: { ...custom.logo!, opacity: +e.target.value } })} />
                  </label>
                  <p className="muted small">Drag the logo on the video to place it.</p>
                  <div className="insp-actions">
                    <label className="btn ghost small">Replace<input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
                    <button className="btn ghost small" onClick={removeLogo}>Remove</button>
                  </div>
                </>
              ) : (
                <label className="btn small">Upload a logo (PNG, JPEG, WebP · up to 2 MB)<input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
              )}
            </div>
          )}

          {tab === "style" && (
            <div className="insp">
              <div className="insp-canvas">
              <h3>Canvas</h3>
              <label>Video shape
                <select value={cv?.ratio ?? "source"} onChange={(e) => tweak({ canvas: { ratio: e.target.value as CanvasRatio, fit: cv?.fit ?? "fit", bg: cv?.bg ?? "blur" } })}>
                  {Object.entries(CANVAS_RATIOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              {shaped && <>
                <div className="seg" role="group" aria-label="Fit">
                  <button aria-pressed={cv!.fit === "fit"} onClick={() => tweak({ canvas: { ...cv!, fit: "fit" } })}>Fit whole video</button>
                  <button aria-pressed={cv!.fit === "fill"} onClick={() => tweak({ canvas: { ...cv!, fit: "fill" } })}>Fill (crop)</button>
                </div>
                {cv!.fit === "fit" && <div className="look-row">
                  <label className="cz-check"><input type="radio" name="bg" checked={cv!.bg === "blur"} onChange={() => tweak({ canvas: { ...cv!, bg: "blur" } })} /> Blurred video behind</label>
                  <label className="cz-check"><input type="radio" name="bg" checked={cv!.bg !== "blur"} onChange={() => tweak({ canvas: { ...cv!, bg: cv!.bg !== "blur" ? cv!.bg : "#000000" } })} /> Colour</label>
                  {cv!.bg !== "blur" && <input type="color" aria-label="Background colour" value={cv!.bg} onChange={(e) => tweak({ canvas: { ...cv!, bg: e.target.value } })} />}
                </div>}
              </>}
              </div>

              <h3>Font</h3>
              {/* Every font, written in itself: one tap sets it for the captions (the style's own font is "Style's"). */}
              <div className="font-chips" role="radiogroup" aria-label="Font">
                <button role="radio" aria-checked={!custom.font} onClick={() => tweak({ font: undefined })}>
                  <span style={{ fontFamily: look.font }}>Aa</span><small>Style&apos;s</small>
                </button>
                {[...NEW_FONTS, ...CAPTION_FONTS.filter((f) => !NEW_FONTS.includes(f))].map((f) => ( // the new ones first
                  <button key={f} role="radio" aria-checked={custom.font === f} onClick={() => tweak({ font: f })}>
                    <span style={{ fontFamily: `"${f}"` }}>Aa</span><small>{f}</small>
                    {NEW_FONTS.includes(f) && <i className="fc-new">New</i>}
                  </button>
                ))}
              </div>

              {ownLooks > 0 && (
                <div className="own-looks" role="status">
                  <span>{ownLooks} caption{ownLooks === 1 ? " has" : "s have"} a look of {ownLooks === 1 ? "its" : "their"} own, so changes here don&apos;t reach {ownLooks === 1 ? "it" : "them"}.</span>
                  <button className="btn small" onClick={sameLook}>Make all captions the same</button>
                </div>
              )}
              <h3>Project style</h3>
              <p className="muted small">{styleOf(styleId).blurb} Applies to every caption without its own look.</p>
              {/* The styles on offer, plus this project's own if it's one no longer offered (so it still shows as picked). */}
              {STYLE_GROUPS.concat(STYLE_GROUPS.includes(styleOf(styleId).group) ? [] : [styleOf(styleId).group]).map((g) => (
                <div key={g} className="style-group">
                  <span className="muted small">{g}</span>
                  <div className="style-grid" role="radiogroup" aria-label={`${g} styles`}>
                    {CAPTION_STYLES.filter((x) => x.group === g && (STYLE_CHOICES.includes(x) || x.id === styleId)).map((x) => (
                      <button key={x.id} role="radio" aria-checked={styleId === x.id} className="style-chip" onClick={() => pickStyle(x.id)}>
                        <span className="style-sample" style={{ "--s": x.size ?? 1 } as React.CSSProperties}><StyledCaption styleId={x.id} text="Aa கா" start={0} end={1} time={0.99} /></span>
                        <span className="style-name">{x.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="insp-head">
                <h3>Customize</h3>
                <button className="btn ghost small" onClick={() => { sameLook(); setCustom((c) => projectOnly(c)); }} disabled={Object.keys(custom).every((k) => PROJECT_KEYS.includes(k)) && !ownLooks}>Reset to {styleOf(styleId).name}</button>
              </div>
              <LookControls look={look} own={custom} set={lookAll} tamil={tamil} />
              <div className="cz-grid">
                <div className="cz-field">
                  <span>Lines</span>
                  <div className="seg" role="group" aria-label="Lines per subtitle">
                    {([["", "Auto"], ["1", "1"], ["2", "2"], ["3", "3"]] as const).map(([v, l]) => (
                      <button key={l} aria-pressed={String(look.lines ?? "") === v} onClick={() => tweak({ lines: v ? (+v as 1 | 2 | 3) : undefined })}>{l}</button>
                    ))}
                  </div>
                </div>
                <label>Safe zone
                  <select value={custom.safe ?? "none"} onChange={(e) => tweak({ safe: e.target.value as SafeZoneId, safeCustom: e.target.value === "custom" ? custom.safeCustom ?? { ...SAFE_ZONES.custom.m } : undefined })}>
                    {Object.entries(SAFE_ZONES).map(([id, z]) => <option key={id} value={id}>{z.name}</option>)}
                  </select>
                </label>
                <label className="cz-check"><input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} /> Show safe zones on the video</label>
                {/* Every zone can be adjusted: moving a slider makes it a custom zone starting from the one picked. Both
                    sides move together so captions stay centred. */}
                {([["top", "Keep clear: top"], ["bottom", "Keep clear: bottom"], ["left", "Keep clear: sides"]] as const).map(([k, label]) => (
                  <label key={k}>{label} <span className="cz-val">{Math.round(look.safe[k] * 100)}%</span>
                    <input type="range" min={0} max={0.4} step={0.01} value={look.safe[k]}
                      onChange={(e) => tweak({ safe: "custom", safeCustom: { ...look.safe, ...(k === "left" ? { left: +e.target.value, right: +e.target.value } : { [k]: +e.target.value }) } })} />
                  </label>
                ))}
                {look.position !== "middle" && (
                  <label>Distance from {look.position} <span className="cz-val">{Math.round(look.offset * 100)}%</span>
                    <input type="range" min={0.02} max={0.45} step={0.01} value={look.offset} onChange={(e) => tweak({ offset: +e.target.value })} />
                  </label>
                )}
              </div>
            </div>
          )}

          {tab === "export" && (
            <div className="insp">
              <h3>Video with captions (MP4)</h3>
              {rendering ? (
                <div className="render-progress">
                  <span className="bar"><i style={{ width: `${Math.max(3, job.renderProgress)}%` }} /></span>
                  <span className="muted small">{job.renderStatus === "queued" ? "Waiting to render…" : `Rendering · ${job.renderProgress}%`}</span>
                </div>
              ) : (
                <div className="insp-actions">
                  <button className="btn" onClick={render} disabled={!videoHere}>{coming ? `Video uploading · ${local ? progressOf(local) : 0}%` : dirty ? "Save and export MP4" : "Export MP4"}</button>
                  {job.renderStatus === "done" && <a className="btn ghost" href={`/api/jobs/${job.id}/render`} download>Download MP4</a>}
                </div>
              )}
              {job.renderStatus === "failed" && <p className="error">{job.renderError}</p>}
              <p className="muted small">Burns in {view === "both" ? `${language.name} + English` : view === "en" ? "English" : language.name} (the language shown under the video), with every caption&apos;s own look. {coming ? "The MP4 can be made once the video has finished uploading (keep this tab open)." : !videoHere && "The video was removed after 7 days, so it can't be exported."}</p>

              <h3>Subtitle files</h3>
              <div className="export-row">
                <label>Language
                  <select value={lang} onChange={(e) => setLang(e.target.value as View)}>
                    {hasSpoken && <option value="ta">{language.name}</option>}
                    {hasEnglish && <option value="en">English</option>}
                    {hasEnglish && hasSpoken && <option value="both">{language.name} + English</option>}
                  </select>
                </label>
                <label>Format
                  <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
                    <option value="srt">SRT (Premiere, Resolve, YouTube)</option><option value="vtt">WebVTT</option><option value="txt">Plain text</option>
                  </select>
                </label>
              </div>
              <div className="insp-actions">
                {dirty ? <button className="btn" onClick={save}>Save changes to download</button>
                  : <>
                    <a className="btn" href={`/api/jobs/${job.id}/export?lang=${lang}&fmt=${fmt}`} download>Download {fmt.toUpperCase()}</a>
                    {(["srt", "vtt", "txt"] as const).filter((f) => f !== fmt).map((f) => <a key={f} className="btn ghost small" href={`/api/jobs/${job.id}/export?lang=${lang}&fmt=${f}`} download>{f.toUpperCase()}</a>)}
                  </>}
              </div>
              <p className="muted small">{cues.length} subtitles · made with {job.provider} / {job.model}</p>
              <button className="btn danger small" onClick={del}>Delete project</button>
            </div>
          )}
          </div>
        </aside>
      </div>

      <div className="ed-timeline">
        <div className="ed-tl-bar">
          <span className="muted small">Timeline — drag a caption to move it, its edges to retime it, the words of the selected caption to retime them.</span>
          <span className="ed-zoom">
            <button className="btn ghost small" onClick={() => setZoom((z) => Math.max(10, z / 1.25))} aria-label="Zoom out (−)">−</button>
            <input type="range" min={10} max={600} value={zoom} onChange={(e) => setZoom(+e.target.value)} aria-label="Timeline zoom" />
            <button className="btn ghost small" onClick={() => setZoom((z) => Math.min(600, z * 1.25))} aria-label="Zoom in (+)">+</button>
          </span>
        </div>
        <Timeline cues={cues} duration={duration} now={now} selected={selected} zoom={zoom} line={line} playing={playing}
          onSeek={seek} onSelect={select}
          layers={layers.map((l) => ({ start: l.start, end: l.end, label: l.text }))} selectedLayer={selLayer}
          onSelectLayer={(i) => { setSelLayer(i); setTab("layers"); }} onDragLayer={(i, span) => editLayer(i, span)}
          onDrag={(i, patch) => { if (!dragFrom.current) dragFrom.current = cues; setCuesRaw((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c))); }}
          onDragEnd={() => { const from = dragFrom.current; dragFrom.current = null; if (from) { setPast((p) => [...p.slice(-199), from]); setFuture([]); setDirty(true); } }} />
      </div>

      {/* Phones: the editing actions within thumb's reach, and messages just above them. On the page body: inside
          the glass panels a fixed bar would stick to the panel, not the screen. */}
      {inBrowser && createPortal(<>
      {msg && <p className="ed-mtoast" role="status">{msg}</p>}
      <div className="ed-mbar" role="toolbar" aria-label="Edit">
        <button onClick={undo} disabled={!past.length}><Icon name="undo" />Undo</button>
        <button onClick={redo} disabled={!future.length}><Icon name="redo" />Redo</button>
        <button onClick={split}><Icon name="split" />Split</button>
        <button onClick={merge}><Icon name="merge" />Merge</button>
        <button onClick={add}><Icon name="add" />Add</button>
        <button onClick={() => remove()} disabled={target() < 0}><Icon name="delete" />Delete</button>
        <button className="primary" onClick={save} disabled={!dirty || saving}><Icon name="save" />{saving ? "Saving" : dirty ? "Save" : "Saved"}</button>
      </div>
      </>, document.body)}
    </div>
  );
}

function ShortcutHelp() {
  const keys: [string, string][] = [["Space", "Play / pause"], ["← →", "One frame (with ⇧: one second)"], ["↑ ↓", "Previous / next caption"], ["S", "Split at the playhead"], ["M", "Merge with the next"], ["A", "Add a caption at the playhead"], ["Delete", "Delete the caption"], ["⌘Z / ⇧⌘Z", "Undo / redo"], ["⌘S", "Save"], ["+ / −", "Zoom the timeline"], ["G", "Centring guides on / off"]];
  return (
    <dl className="keys">
      {keys.map(([k, v]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}
    </dl>
  );
}

function TimeInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(tc(value)); // parent remounts via key when value changes
  return (
    <input
      className="time"
      value={text}
      aria-label={label}
      title={label}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      onBlur={() => { const v = parseTc(text); if (v === null) setText(tc(value)); else if (Math.abs(v - value) > 0.0005) onChange(v); }}
    />
  );
}
