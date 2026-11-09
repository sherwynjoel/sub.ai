"use client";
import RenameProject from "@/components/RenameProject";
import FindReplace from "@/components/FindReplace";
import TimeInput, { tc } from "@/components/TimeInput";
import { unpackLevels } from "@/lib/waveform";
import { stem } from "@/lib/projectName";
import type { Step } from "@/lib/deviceExport";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { popupRoot } from "@/lib/popupRoot";
import type { Cue, WordLook } from "@/db/schema";
import { LANGUAGES, languageOf, shortCode } from "@/lib/languages";
import { BLENDS, CANVAS_RATIOS, CAPTION_FONTS, FONT_LIKE, highlights, mergeCustom, MIN_FIT, punchBlend, resolveStyle, SAFE_ZONES, styleOf, type CanvasRatio, type CaptionCustom, type CaptionStyle, type Placement, type SafeZoneId, type TextLayer, pushDown, shownLines } from "@/lib/captionStyles";
import { insertAt, insertBetween, mergeCues, MIN_CAPTION, removeCue, retime, setText, setWord, shiftFrom, splitCue, startsOf, wordsOf } from "@/lib/cueEdit";
import { englishCues } from "@/lib/subtitles";
import { ISSUE_TEXT, timingIssues } from "@/lib/timing";
import { typeLabel, typeOf, type CaptionType } from "@/lib/captionTypes";
import { minSec } from "@/lib/plans";
import CaptionTypePicker from "@/components/CaptionTypePicker";
import { keepVideo, localVideo, subscribeVideos, videosVersion } from "@/lib/localVideo";
import SubtitleReveal from "@/components/SubtitleReveal";
import LookControls from "@/components/LookControls";
import StyledCaption from "@/components/StyledCaption";
import StylePicker from "@/components/StylePicker";
import FlowSteps from "@/components/FlowSteps";
import Timeline from "@/components/Timeline";
import WordStrip, { type WordRef } from "@/components/WordStrip";
import Presets, { type Preset } from "@/components/Presets";
import ColorPicker from "@/components/ColorPicker";
import FontPicker from "@/components/FontPicker";
import { applyPreset } from "@/lib/presets";
import { pickKeywords } from "@/lib/keywords";
import { zoomAt, zoomMoments, zoomOf } from "@/lib/zoom";
import { BRAND } from "@/lib/brand";
import "@/app/caption-styles.css";

type Job = {
  id: string; filename: string; language: string; status: string; progress: number; error: string | null;
  hasMedia: boolean; hasPreview?: boolean; videoTotal?: number | null; provider: string | null; model: string | null; cues: Cue[]; speech?: [number, number][]; script: string; redos: number; durationSec: number;
  captionStyle: string; captionCustom: CaptionCustom; renderStatus: string | null; renderProgress: number; renderError: string | null; renderLang: string;
};
type View = "ta" | "en" | "both";
type Tab = "caption" | "layers" | "style" | "export";
type Pane = "list" | "caption" | "timeline" | "style" | "layers" | "export";
const PANES: [Pane, string][] = [["list", "Captions"], ["caption", "Edit"], ["style", "Style"], ["timeline", "Timeline"], ["layers", "Layers"], ["export", "Export"]];
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
  pause: "M8 5v14M16 5v14",
  volume: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  volumeLow: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7",
  muted: "M11 5 6 9H3v6h3l5 4zM16 9.5l5 5M21 9.5l-5 5",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  shrink: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
  back: "M15 5l-7 7 7 7",
  guides: "M12 3v18M3 12h18M7 3v2M17 3v2M3 7h2M3 17h2",
  timeline: "M3 7h18M3 12h12M3 17h15M9 4v16",
  find: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
};
const Icon = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[name]} /></svg>;
const RATIO = { "9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1, "16:9": 16 / 9 } as const;
/** Settings that belong to the project, not to a look: picking a style or resetting the look keeps them. */
/** A look the user gave this caption (being fitted to the video isn't one). */
const hasOwnLook = (c: Cue) => Object.keys(c.style ?? {}).some((k) => k !== "fit");
const PROJECT_KEYS: string[] = ["safe", "safeCustom", "canvas", "layers", "logo", "show", "lines"];
const projectOnly = (c: CaptionCustom): CaptionCustom => Object.fromEntries(Object.entries(c).filter(([k]) => PROJECT_KEYS.includes(k)));
const EMOJIS = ["😀", "😂", "🔥", "❤️", "👍", "🎉", "✨", "💯", "😍", "🙏", "👀", "⭐"];
const FRAME = 1 / 30;
/** The speed button's steps. */
const SPEEDS = [1, 1.5, 2, 0.5];
/** The latest fonts added: marked "New" in the font row. */
const NEW_FONTS: string[] = ["Alex Brush", "Pinyon Script", "Great Vibes", "Figtree Bold", "GFS Didot", "Oswald Bold", "Bebas Neue", "Lobster", "Pacifico", "Caveat Bold", "Righteous",
  "Archivo Black", "Abril Fatface", "Alfa Slab One", "Comfortaa Bold", "Luckiest Guy", "Titan One"];

/** Where a caption sits over the player (as the MP4 places it): its box's CSS. */
function placeOf(styleId: string, own: CaptionCustom, portrait: boolean) {
  const look = resolveStyle(styleId, own, portrait), { position, offset, x, y, safe, textAlign, blend } = look;
  const free = x !== undefined && y !== undefined;
  const pct = (n: number) => `${n * 100}%`;
  const sides = { left: pct(safe.left), right: pct(safe.right), textAlign };
  // Dragged with the text aligned to a side: the lines flush to that side of a column centred on the point (as the MP4)
  const column = 2 * Math.min(0.5 - Math.max(safe.left, safe.right), x !== undefined ? Math.min(x - safe.left, 1 - safe.right - x) : 0.5);
  // the text blended with the video (as the MP4); with only the punch blended, its copy is (punchMix)
  const mix: React.CSSProperties = blend && !punchBlend(look) ? { mixBlendMode: BLENDS[blend][1] } : {};
  const place: React.CSSProperties = free ? { ...mix, left: pct(x), top: pct(y), ...(textAlign && textAlign !== "center" ? { width: pct(column), textAlign } : { maxWidth: pct(Math.min(0.92, 2 * Math.min(x - safe.left, 1 - safe.right - x))) }) }
    : position === "top" ? { ...mix, ...sides, top: pct(offset), bottom: "auto" }
    : position === "middle" ? { ...mix, ...sides, top: pct((safe.top + 1 - safe.bottom) / 2), bottom: "auto", transform: "translateY(-50%)" }
    : { ...mix, ...sides, bottom: pct(offset) };
  const punchMix: React.CSSProperties | null = blend && punchBlend(look) ? { ...place, mixBlendMode: BLENDS[blend][1] } : null;
  return { free, place, punchMix };
}

/**
 * The sides of the video a caption's text runs past (by more than 2 px), or null when it's all inside: measured from
 * every piece of its text, which can stick out of its own box (lines that don't wrap, big words). The MP4 cuts there.
 */
function outsideOf(box: HTMLElement, frame: DOMRect) {
  const out = { left: false, right: false, top: false, bottom: false };
  for (const el of box.querySelectorAll<HTMLElement>(".cap-main, .cap-main *, .cap-sub")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.left < frame.left - 2) out.left = true;
    if (r.right > frame.right + 2) out.right = true;
    if (r.top < frame.top - 2) out.top = true;
    if (r.bottom > frame.bottom + 2) out.bottom = true;
  }
  return out.left || out.right || out.top || out.bottom ? out : null;
}
const sidesText = (o: { left: boolean; right: boolean; top: boolean; bottom: boolean }) =>
  (["left", "right", "top", "bottom"] as const).filter((k) => o[k]).join(", ");

/**
 * How a caption's text sits in the frame: past its edge (`out`), past the fit margin (`tight`), and what would bring it
 * in. The second language keeps its own size and wraps, so its width is no reason to shrink the caption.
 */
function reachOf(box: HTMLElement, frame: DOMRect) {
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity, subL = Infinity, subR = -Infinity;
  for (const el of box.querySelectorAll<HTMLElement>(".cap-main, .cap-main *, .cap-sub")) {
    const q = el.getBoundingClientRect();
    if (!q.width || !q.height) continue;
    t = Math.min(t, q.top); b = Math.max(b, q.bottom);
    if (el.classList.contains("cap-sub")) { subL = q.left; subR = q.right; }
    else { l = Math.min(l, q.left); r = Math.max(r, q.right); }
  }
  if (t === Infinity) return null;
  const m = Math.min(frame.width, frame.height) * 0.02;
  return {
    out: Math.min(l, subL) < frame.left - 2 || Math.max(r, subR) > frame.right + 2 || t < frame.top - 2 || b > frame.bottom + 2,
    tight: l < frame.left + m || r > frame.right - m || t < frame.top + m || b > frame.bottom - m,
    ratio: Math.min((frame.width - 2 * m) / Math.max(1, r - l), (frame.height - 2 * m) / (b - t)),
  };
}

const FIT_ROUNDS = 14;
type FitResult = { fits: Map<number, number>; out: number[] };
type FitMemo = Map<string, { fit?: number; out: boolean }>;
/** When to look at a caption, as a share of its time: 1 is fully shown. Pages, and marks that re-wrap the line, change as it plays. */
const momentsOf = (s: CaptionStyle) => (s.effect === "stack" || s.mark ? [0.2, 0.4, 0.6, 0.8, 1] : [1]);

/**
 * Every caption laid out unseen in the player, as the view being exported shows it. One that goes outside is shrunk a
 * step at a time until it fits; one whose size or place the user chose is left alone and reported. Always worked out
 * from full size, so a caption grows back when it has room. Captions already worked out (`memo`) aren't measured again.
 */
function FitScan({ cues, styleId, custom, portrait, ratio, view, memo, onDone }: {
  cues: Cue[]; styleId: string; custom: CaptionCustom; portrait: boolean; ratio: number; view: View; memo: FitMemo; onDone: (r: FitResult | null) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  // English alone is grouped into its own captions; each takes its look, and its fit, from the caption it starts in.
  const shown = useMemo(() => {
    const regrouped = view === "en" && cues.some((c) => c.ta);
    return (regrouped ? englishCues(cues) : cues).map((c, n) => {
      const text = view === "en" ? c.en : c.ta, times = view === "en" ? c.we : c.w, looks = view === "en" ? c.wfe : c.wf;
      const own = mergeCustom(custom, c.style), { fit: _, ...look } = own; // eslint-disable-line @typescript-eslint/no-unused-vars
      const key = JSON.stringify([styleId, ratio, portrait, view, text, view === "both" ? c.en : "", c.end - c.start, times?.map((t) => t - c.start), looks, look]);
      return { c, text, times, looks, own, key, i: regrouped ? cues.findIndex((x) => c.start >= x.start - 0.01 && c.start < x.end) : n };
    }).filter((x) => x.i >= 0 && x.text.trim());
  }, [cues, view, styleId, custom, ratio, portrait]);
  const [fits, setFits] = useState<Record<number, number>>({});
  const [left, setLeft] = useState(() => new Set(shown.filter((x) => !memo.has(x.key)).map((x) => x.i))); // the captions still being fitted
  const round = useRef(0), out = useRef(new Map<number, boolean>()); // each caption as last measured
  useLayoutEffect(() => {
    const el = root.current, frame = el?.parentElement?.getBoundingClientRect();
    if (!el || !frame?.width) { onDone(null); return; }
    const need = new Map<number, number>(); // the captions to shrink, and by how much
    const boxes = el.querySelectorAll<HTMLElement>("[data-cue]");
    boxes.forEach((box) => out.current.set(+box.dataset.cue!, false));
    boxes.forEach((box) => {
      const at = reachOf(box, frame), i = +box.dataset.cue!;
      if (!at) return;
      if (at.out) out.current.set(i, true);
      if (!box.dataset.fixed && at.tight) need.set(i, Math.min(need.get(i) ?? 1, at.ratio));
    });
    const next = { ...fits }, again = new Set<number>();
    for (const [i, by] of need) {
      const now = fits[i] ?? 1, smaller = Math.max(MIN_FIT, Math.floor(now * Math.min(0.94, by) * 100) / 100);
      if (smaller < now) { next[i] = smaller; again.add(i); }
    }
    if (again.size && ++round.current < FIT_ROUNDS) { setFits(next); setLeft(again); return; }
    // Whatever is outside now can't be fitted, or isn't ours to change.
    if (memo.size > 20000) memo.clear();
    const done = new Map<number, number>(), off = new Set<number>();
    for (const x of shown) {
      const seen = memo.get(x.key), fit = seen ? seen.fit : fits[x.i], isOut = seen ? seen.out : !!out.current.get(x.i);
      if (!seen) memo.set(x.key, { fit, out: isOut });
      if (fit) done.set(x.i, Math.min(fit, done.get(x.i) ?? 1));
      if (isOut) off.add(x.i);
    }
    onDone({ fits: done, out: [...off].sort((a, b) => a - b) });
  }, [fits]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={root} className="out-scan" aria-hidden="true">
      {shown.map(({ c, text, times, looks, own: own0, i }, n) => {
        if (!left.has(i)) return null;
        const own = { ...own0, fit: fits[i] };
        const fixed = own.size !== undefined || own.x !== undefined || !!looks?.some((l) => (l?.size ?? 1) > 1);
        const { free, place } = placeOf(styleId, own, portrait);
        return momentsOf(resolveStyle(styleId, own, portrait)).map((m) => (
          <div key={`${n}/${m}`} data-cue={i} data-fixed={fixed ? "1" : undefined} className={`overlay styled${free ? " free" : ""}`} style={place}>
            <div className="drag-handle">
              <StyledCaption styleId={styleId} custom={own} text={text} sub={view === "both" ? c.en : undefined} start={c.start} end={c.end} ratio={ratio} looks={looks}
                time={m === 1 ? c.end - 0.01 : c.start + m * (c.end - c.start)} starts={m === 1 ? times?.map(() => c.start) ?? text.split(/\s+/).filter(Boolean).map(() => c.start) : times} />
            </div>
          </div>
        ));
      })}
    </div>
  );
}

/** The styled caption over the player, redrawn every frame while the video plays so word timing is smooth. */
function LiveCaption({ video, cues, styleId, custom, portrait, ratio, view, selected, picked, editing, wordBar, onMove, onResize, onTap, onEditOpen, onEditDone, onWord, onWordClose, onLook }: {
  video: React.RefObject<HTMLVideoElement | null>; cues: Cue[]; styleId: string; custom: CaptionCustom; portrait: boolean; ratio: number; view: View; selected: number;
  picked: (start: number) => boolean; editing: string | null;
  wordBar: { cue: number; j: number } | null; // the word picked on the video, its tools shown over it
  onMove: (i: number, x: number, y: number) => void;
  onResize: (i: number, size: number) => void;
  onTap: (start: number, word?: number) => void; onEditOpen: () => void; onEditDone: (text: string | null) => void;
  onWord: (patch: { look?: WordLook | null; color?: string | null }) => void; onWordClose: () => void;
  onLook: (patch: CaptionCustom, all: boolean) => void; // the caption being typed: its look, or every caption's
}) {
  const [t, setT] = useState(0);
  const [sizing, setSizing] = useState<number | null>(null); // the size shown while the corner is dragged
  const [draft, setDraft] = useState<string | null>(null); // the text being typed (its lines shown live above it)
  const [fmtAll, setFmtAll] = useState(false); // the format bar changes every caption (else the one being typed)
  const typed = useRef<HTMLTextAreaElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [out, setOut] = useState<string | null>(null); // the sides of the video the caption on screen goes past
  useLayoutEffect(() => { // after every redraw (a frame, an edit, a drag, a resize): measured against the video
    const el = box.current, frame = el?.parentElement?.getBoundingClientRect();
    const o = el && frame ? outsideOf(el, frame) : null;
    setOut(o ? sidesText(o) : null);
  }, [t, cues, custom, styleId, ratio, view, sizing, draft, selected]);
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
  const { scale } = resolveStyle(styleId, own, portrait);
  const { free, place, punchMix } = placeOf(styleId, own, portrait);
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const frame = video.current?.parentElement?.getBoundingClientRect();
    if (!frame) return;
    e.preventDefault();
    video.current?.pause();
    // tapping a caption on the video picks it (its tools come up under the video), and the word tapped (its tools over it)
    // (the caption's text lets the pointer through, so the word is the one whose box holds it)
    const hit = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-j]")].find((el) => {
      const b = el.getBoundingClientRect();
      return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    });
    const w = hit?.dataset.j;
    onTap(c.start, w == null ? undefined : +w);
    follow(e, frame, (x, y) => { video.current?.pause(); onMove(i, x, y); }, 0.05, e.currentTarget.parentElement);
  };
  // The corner dot resizes: the caption grows as the pointer moves away from its centre (Size, 40–260%).
  const resize = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget.parentElement as HTMLElement, box = handle.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const d0 = Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)), s0 = scale; // 1 = the standard size
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
  // Editing starts from the lines as they're shown; Enter moves the words after the cursor down a line.
  const shown = editing !== null ? shownLines(styleId, own, editing, ratio) : "";
  const typing = draft ?? shown;
  const done = (text: string | null) => { setDraft(null); setFmtAll(false); onEditDone(text === null || text.trim() === shown ? null : text); };
  const enter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.key === "Escape") { setDraft(null); onEditDone(null); return; }
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) { ta.blur(); return; }
    const next = pushDown(ta.value, ta.selectionStart);
    setDraft(next.text);
    requestAnimationFrame(() => ta.setSelectionRange(next.at, next.at));
  };
  return (<>
    {out && editing === null && <span className="out-badge" role="status">⚠ This subtitle goes outside the video ({out}): make it smaller or move it in</span>}
    <div ref={box} className={`overlay styled${free ? " free" : ""}${ghost ? " ghost" : ""}${picked(c.start) ? " picked" : ""}${out ? " outside" : ""}`} style={place}>
      {editing !== null ? (<>
        {typing.trim() && <div className="cap-typing" aria-hidden="true">
          <StyledCaption styleId={styleId} custom={own} text={typing} start={c.start} end={c.end} time={c.end - 0.01} ratio={ratio}
            starts={typing.split(/\s+/).filter(Boolean).map(() => c.start)} /> {/* every word in, settled */}
        </div>}
        <textarea className="cap-inline" lang={line === "ta" ? undefined : "en"} value={typing} onChange={(e) => setDraft(e.target.value)} autoFocus
          rows={Math.max(2, typing.split("\n").length)} aria-label="Caption text"
          title="Enter moves the words after the cursor to the next line · Shift+Enter a new line · Ctrl/⌘+Enter, Done or click away to save · Esc to cancel"
          ref={(el) => { (typed as React.MutableRefObject<HTMLTextAreaElement | null>).current = el; if (el && !el.dataset.placed) { el.dataset.placed = "1"; el.setSelectionRange(el.value.length, el.value.length); } }} // the cursor at the end, once
          onKeyDown={enter} />
        <FormatBar look={resolveStyle(styleId, own, portrait)} all={fmtAll} onAll={setFmtAll} onLook={(patch) => onLook(patch, fmtAll)} onDone={() => done(typed.current?.value ?? typing)} />
      </>) : (
      <div className="drag-handle" onPointerDown={drag} onDoubleClick={onEditOpen} title="Tap to pick, drag to move, double-click to edit the text">
        <StyledCaption styleId={styleId} custom={own} text={main} sub={view === "both" ? c.en : undefined} start={c.start} end={c.end} time={ghost ? c.end - 0.01 : t}
          starts={line === "en" ? c.we : c.w} colors={line === "en" ? c.wce : c.wc} looks={line === "en" ? c.wfe : c.wf} ratio={ratio} part={punchMix ? "plain" : undefined}
          pickedWord={wordBar?.cue === i && video.current?.paused !== false ? wordBar.j : undefined} />
        {wordBar?.cue === i && video.current?.paused !== false && wordsOf(main)[wordBar.j] && (
          <WordBar word={wordsOf(main)[wordBar.j]} look={(line === "en" ? c.wfe : c.wf)?.[wordBar.j] ?? null} color={(line === "en" ? c.wce : c.wc)?.[wordBar.j] ?? null}
            base={resolveStyle(styleId, own)} onChange={onWord} onClose={onWordClose} />
        )}
        {video.current?.paused !== false && <span className="rs-handle" onPointerDown={resize} title="Drag to resize the subtitle" aria-hidden="true" />}
        {sizing !== null && <span className="rs-size">{Math.round(sizing * 100)}%</span>}
      </div>
      )}
    </div>
    {/* Setup & Punch Pro: the punch words alone, blended with the video, over the plain caption */}
    {punchMix && editing === null && <div className={`overlay styled punch-copy${free ? " free" : ""}${ghost ? " ghost" : ""}`} style={punchMix} aria-hidden="true">
      <div className="drag-handle">
        <StyledCaption styleId={styleId} custom={own} text={main} sub={view === "both" ? c.en : undefined} start={c.start} end={c.end} time={ghost ? c.end - 0.01 : t}
          starts={line === "en" ? c.we : c.w} colors={line === "en" ? c.wce : c.wc} looks={line === "en" ? c.wfe : c.wf} ratio={ratio} part="punch" />
      </div>
    </div>}
  </>);
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
    const words = l.text.split(/\s+/).filter(Boolean), look = resolveStyle(styleId, own), blend = look.blend, split = punchBlend(look);
    const at = { left: `${l.x * 100}%`, top: `${l.y * 100}%` };
    return (<Fragment key={i}>
      <div className={`layer-view${i === selected ? " on" : ""}`} style={{ ...at, mixBlendMode: blend && !split ? BLENDS[blend][1] : undefined }}
        onPointerDown={(e) => { onSelect(i); dragIn(e, (x, y) => onMove(i, x, y)); }}>
        <StyledCaption styleId={styleId} custom={own} text={l.text} start={l.start} end={l.end} time={on ? t : l.end - 0.01} starts={words.map(() => l.start)} part={split ? "plain" : undefined} />
        {i === selected && <span className="rs-handle" title="Drag to resize" aria-hidden="true"
          onPointerDown={(e) => resizeFrom(e, resolveStyle(styleId, own).scale, 0.4, 2.6, 0.05, (s) => onResize(i, s))} />}
      </div>
      {split && <div className="layer-view punch-copy" style={{ ...at, mixBlendMode: BLENDS[blend!][1] }} aria-hidden="true">
        <StyledCaption styleId={styleId} custom={own} text={l.text} start={l.start} end={l.end} time={on ? t : l.end - 0.01} starts={words.map(() => l.start)} part="punch" />
      </div>}
    </Fragment>);
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
      {/* quarter lines, matching the ruler's 25 and 75 */}
      <i className="g-q g-qv" style={{ left: "25%" }} /><i className="g-q g-qv" style={{ left: "75%" }} />
      <i className="g-q g-qh" style={{ top: "25%" }} /><i className="g-q g-qh" style={{ top: "75%" }} />
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
/**
 * A toolbar drawn over the page (the video clips what's inside it), next to the caption its anchor sits in: above
 * it, or under it when there's no room above (a caption near the top), kept on screen; placed again whenever the
 * caption changes size or the page moves.
 */
function useFloat() {
  const anchor = useRef<HTMLSpanElement>(null), bar = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const place = useCallback(() => {
    const cap = anchor.current?.parentElement?.getBoundingClientRect(), b = bar.current;
    if (!cap || !b) return;
    const w = b.offsetWidth, h = b.offsetHeight, gap = 10;
    const left = Math.min(Math.max(8, cap.left + cap.width / 2 - w / 2), innerWidth - w - 8);
    const top = cap.top - gap - h >= 8 ? cap.top - gap - h : cap.bottom + gap + h <= innerHeight - 8 ? cap.bottom + gap : Math.max(8, innerHeight - h - 8);
    setAt((p) => (p && Math.abs(p.left - left) < 0.5 && Math.abs(p.top - top) < 0.5 ? p : { left, top }));
  }, []);
  useLayoutEffect(place);
  useEffect(() => {
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => { removeEventListener("resize", place); removeEventListener("scroll", place, true); };
  }, [place]);
  return { anchor, bar, at: (at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: "hidden" }) as React.CSSProperties };
}

/**
 * The look of the caption being typed, beside its text box: font, size, colour, bold, italic, capitals and
 * alignment, for this caption or every caption.
 */
function FormatBar({ look, all, onAll, onLook, onDone }: {
  look: CaptionStyle & Placement; all: boolean; onAll: (all: boolean) => void; onLook: (patch: CaptionCustom) => void; onDone: () => void;
}) {
  const { anchor, bar, at } = useFloat();
  const size = look.scale;
  // Typing ends with a click outside the text box and these tools (the colour picker's panel counts as them).
  const finish = useRef(onDone);
  useLayoutEffect(() => { finish.current = onDone; });
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.(".cap-inline, .fmt-bar, .cp-pop, .fp-pop")) finish.current(); };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, []);
  const resize = (d: number) => onLook({ size: Math.round(Math.min(2.6, Math.max(0.4, size + d)) * 20) / 20 });
  return (<>
    <span ref={anchor} hidden />
    {createPortal(
      <div ref={bar} className="word-bar fmt-bar" role="toolbar" aria-label="Caption look" style={at} onPointerDown={(e) => e.stopPropagation()}>
        <FontPicker value={look.font} onChange={(f) => onLook({ font: f })} fonts={CAPTION_FONTS} label="Font" sample="Make great videos" className="fp-dark" />
        <span className="wb-size">
          <button onClick={() => resize(-0.1)} aria-label="Smaller" title="Smaller">A−</button>
          <b>{Math.round(size * 100)}%</b>
          <button onClick={() => resize(0.1)} aria-label="Bigger" title="Bigger">A+</button>
        </span>
        <ColorPicker value={hexOf(look.color)} onChange={(c) => onLook({ color: c })} label="Text colour" />
        <button aria-pressed={!!look.bold} onClick={() => onLook({ bold: !look.bold })} style={{ fontWeight: 800 }} title="Bold">B</button>
        <button aria-pressed={!!look.italic} onClick={() => onLook({ italic: !look.italic })} style={{ fontStyle: "italic" }} title="Italic">I</button>
        <button aria-pressed={!!look.caps} onClick={() => onLook({ case: look.caps ? "none" : "upper" })} title="Capitals">AA</button>
        <span className="fmt-seg" role="group" aria-label="Alignment">
          {(["left", "center", "right"] as const).map((a) => (
            <button key={a} aria-pressed={(look.textAlign ?? "center") === a} onClick={() => onLook({ textAlign: a })} title={`Align ${a === "center" ? "centre" : a}`} aria-label={`Align ${a === "center" ? "centre" : a}`}>
              <svg width="14" height="12" viewBox="0 0 16 12" aria-hidden="true">{[12, 8, 12, 6].map((w, n) => <rect key={n} x={a === "left" ? 2 : a === "right" ? 14 - w : 8 - w / 2} y={n * 3} width={w} height="1.6" rx=".8" fill="currentColor" />)}</svg>
            </button>
          ))}
        </span>
        <span className="fmt-seg" role="group" aria-label="Apply to">
          <button aria-pressed={!all} onClick={() => onAll(false)}>This caption</button>
          <button aria-pressed={all} onClick={() => onAll(true)}>All</button>
        </span>
        <button className="fmt-done" onClick={onDone} title="Save the text (Ctrl/⌘+Enter)">Done</button>
      </div>, popupRoot())}
  </>);
}
const hexOf = (c: string | undefined) => (c && /^#[0-9a-f]{6}/i.test(c) ? c.slice(0, 7) : "#FFFFFF");

/**
 * Tools for one word, over the caption on the video: its font, size, colour, bold and italic (the MP4 draws the same,
 * captionStyles wordLookTags), or back to the caption's own look.
 */
function WordBar({ word, look, color, base, onChange, onClose }: {
  word: string; look: WordLook | null; color: string | null; base: CaptionStyle; onChange: (patch: { look?: WordLook | null; color?: string | null }) => void; onClose: () => void;
}) {
  const size = look?.size ?? 1;
  const resize = (d: number) => { const n = Math.round(Math.min(3, Math.max(0.4, size + d)) * 10) / 10; onChange({ look: { size: Math.abs(n - 1) < 0.001 ? undefined : n } }); };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation(); // not a drag of the caption
  const { anchor, bar, at } = useFloat();
  return (<>
    <span ref={anchor} hidden />
    {createPortal(
    <div ref={bar} className="word-bar" role="toolbar" aria-label={`Word: ${word}`} onPointerDown={stop} onDoubleClick={stop} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      style={at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: "hidden" }}>
      <FontPicker value={look?.font ?? ""} onChange={(f) => onChange({ look: { font: f || undefined } })} fonts={CAPTION_FONTS} label="Word font" none="Font: caption's" sample={word} className="fp-dark" />
      <span className="wb-size">
        <button onClick={() => resize(-0.1)} aria-label="Smaller" title="Smaller">A−</button>
        <b>{Math.round(size * 100)}%</b>
        <button onClick={() => resize(0.1)} aria-label="Bigger" title="Bigger">A+</button>
      </span>
      <ColorPicker value={(color ?? base.color).slice(0, 7)} onChange={(c) => onChange({ color: c })} label="Word colour" />
      <button aria-pressed={look?.bold ?? !!base.bold} onClick={() => onChange({ look: { bold: !(look?.bold ?? !!base.bold) } })} style={{ fontWeight: 800 }} title="Bold">B</button>
      <button aria-pressed={look?.italic ?? !!base.italic} onClick={() => onChange({ look: { italic: !(look?.italic ?? !!base.italic) } })} style={{ fontStyle: "italic" }} title="Italic">I</button>
      <button onClick={() => onChange({ look: null, color: null })} disabled={!look && !color} title="Back to the caption's look">Reset</button>
      <button onClick={onClose} aria-label="Close" title="Close (Esc)">×</button>
    </div>, popupRoot())}
  </>);
}

function follow(e: React.PointerEvent, frame: DOMRect, onMove: (x: number, y: number) => void, edge: number, around?: HTMLElement | null) {
  // the centre of the thing (or of what it sits in: a caption's column, when its text is aligned to a side)
  const el = e.currentTarget as HTMLElement, box = (around ?? el).getBoundingClientRect();
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

const subscribeNever = () => () => {};
const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/** The server said no, with a reason worth showing. */
class ExportRefused extends Error {}

export default function Editor({ initial, mediaUrl }: { initial: Job; mediaUrl?: string }) {
  const router = useRouter();
  const [job, setJob] = useState(initial);
  // Captions with undo/redo: `cues` is the present; past/future hold earlier and undone versions.
  const [cues, setCuesRaw] = useState<Cue[]>(initial.cues);
  const [past, setPast] = useState<Cue[][]>([]);
  const [future, setFuture] = useState<Cue[][]>([]);
  const dragFrom = useRef<Cue[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const latest = useRef<Cue[]>([]); // the captions now: edits made while a save is on its way still need saving
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
  // One frame of this video: 30 fps until it has played a little and shown what it really is.
  const [frame, setFrame] = useState(FRAME);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(Math.max(1, ...initial.cues.map((c) => c.end)));
  const [selected, setSelected] = useState(-1);
  const [selLayer, setSelLayer] = useState(-1);
  const [logoVer, setLogoVer] = useState(0); // bumps the logo image URL after an upload
  const bgCanvas = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<Tab>("caption");
  const inBrowser = useSyncExternalStore(noop, () => true, () => false); // false while rendered on the server
  // The video stays on the device: this page plays that file, in its original quality (lib/localVideo.ts).
  useSyncExternalStore(subscribeVideos, videosVersion, () => 0);
  const local = inBrowser ? localVideo(initial.id) : undefined;
  const src = mediaUrl ?? local?.url ?? (job.hasMedia ? `/api/jobs/${job.id}/media${job.hasPreview ? "?preview=1" : ""}` : undefined);
  const videoHere = job.hasMedia || !!local; // on this device, or on the server (older projects)
  const coming = !videoHere && !!job.videoTotal;
  // Phones show one section at a time under the video (desktop shows them all).
  const [pane, setPane] = useState<Pane>("list");
  const [zoom, setZoom] = useState(80); // timeline px per second
  const [ripple, setRipple] = useState(false); // moving a caption on the timeline takes the later ones with it
  const [levels, setLevels] = useState<Uint8Array | null>(null); // the sound's shape, for the timeline
  const [finding, setFinding] = useState(false); // find and replace is open
  const [lang, setLang] = useState<View>(!hasEnglish ? "ta" : !hasSpoken ? "en" : shown ?? "both");
  const [fmt, setFmt] = useState("srt");
  const [styleId, setStyleId] = useState(initial.captionStyle || "minimal");
  const [hoverStyle, setHoverStyle] = useState<string | null>(null); // a style pointed at in the picker, shown on the video
  const [custom, setCustom] = useState<CaptionCustom>(initial.captionCustom ?? {});
  // the look the last MP4 was made in: a changed one means that MP4 is out of date
  const [renderedLook, setRenderedLook] = useState(() => JSON.stringify([initial.captionStyle || "minimal", initial.captionCustom ?? {}]));
  const lookChanged = JSON.stringify([styleId, custom]) !== renderedLook;
  const [portrait, setPortrait] = useState(false);
  const [ratio, setRatio] = useState(16 / 9);
  const [showZones, setShowZones] = useState(false);
  const [guides, setGuides] = useState(false); // centring guides kept on (they also show while dragging)
  // Editing on the video: the word picked in the strip, the caption's text open over the video, the timing nudges.
  const [pickedWord, setPickedWord] = useState<WordRef | null>(null);
  const [wordBar, setWordBar] = useState(false);
  // Captions whose text goes outside the video and that can't be fitted (found by FitScan a moment after each change).
  const [outside, setOutside] = useState<number[]>([]);
  // The account's plan: free exports carry a watermark (shown on the preview too, as the MP4 will have it).
  const [freePlan, setFreePlan] = useState(false);
  const [renaming, setRenaming] = useState(false);
  useEffect(() => { // what the phone shows for this video while it plays: the lock screen, Control Center, the Dynamic Island
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: stem(job.filename), artist: BRAND.name, artwork: [{ src: "/vasanam-cover.png", sizes: "512x512", type: "image/png" }] });
    return () => { navigator.mediaSession.metadata = null; };
  }, [job.filename]);
  useEffect(() => { fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((m) => setFreePlan(m?.plan === "free")).catch(() => {}); }, []);
  const [scan, setScan] = useState(0);
  const fitMemo = useRef<FitMemo>(new Map());
  const fitting = useRef(false), outsideNow = useRef<number[]>([]); // a fit is on its way, and what the last one couldn't fit
  const scanDone = useCallback((r: FitResult | null) => {
    fitting.current = false;
    setScan(0);
    if (!r) return;
    setOutside(r.out);
    outsideNow.current = r.out;
    let changed = false;
    const next = latest.current.map((c, i) => {
      const want = r.fits.get(i);
      if (want === c.style?.fit) return c;
      changed = true;
      const style = { ...c.style, fit: want }, out = { ...c };
      if (want === undefined) delete style.fit;
      if (Object.keys(style).length) out.style = style; else delete out.style;
      return out;
    });
    if (changed) { setCuesRaw(next); setDirty(true); } // not an undo step: it's worked out, and worked out again after an undo
  }, []);
  // the picked word's tools shown over it on the video (it was tapped there)
  const [inline, setInline] = useState(false);
  const [nudging, setNudging] = useState(false);
  // Phones: the video fills the screen; the sections open as a sheet from the bottom, the video above it.
  const [sheet, setSheet] = useState(false);
  // the editor's three tips, until hidden (remembered on this browser)
  const hintSeen = useSyncExternalStore(noop, () => { try { return localStorage.getItem("vs-editor-hint") === "1"; } catch { return false; } }, () => true);
  const [hintHidden, setHintGone] = useState(false), hintGone = hintSeen || hintHidden;
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

  // Poll until processing finishes: the time left from how fast it's going; a notice when ready if the tab is away.
  const [eta, setEta] = useState<number | null>(null);
  const [notify, setNotify] = useState(false);
  const canNotify = useSyncExternalStore(noop, () => typeof Notification !== "undefined" && Notification.permission !== "denied", () => false);
  const first = useRef<{ t: number; p: number } | null>(null);
  useEffect(() => {
    if (job.status === "done" || job.status === "failed") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (!res.ok) return;
      const j: Job = await res.json();
      setJob(j);
      if (j.status === "processing" && j.progress > 0) {
        if (!first.current) first.current = { t: Date.now(), p: j.progress };
        const dp = j.progress - first.current.p, dt = (Date.now() - first.current.t) / 1000;
        if (dp >= 3 && dt > 4) setEta(Math.round((dt / dp) * (100 - j.progress)));
      }
      if (j.status === "done") {
        setCuesRaw(j.cues);
        if (document.hidden) {
          document.title = `✓ Ready · ${stem(j.filename)}`;
          try { if (notify && Notification.permission === "granted") new Notification("Your subtitles are ready", { body: j.filename }); } catch { /* not supported */ }
        }
      }
    }, 3000);
    return () => clearInterval(t);
  }, [job.id, job.status, notify]);

  // The MP4 is made on this device (lib/deviceExport.ts), so it lasts as long as this page.
  const [exporting, setExporting] = useState<Step | null>(null);
  const [made, setMade] = useState<{ url: string; name: string } | null>(null);
  const [exportError, setExportError] = useState("");
  const [wrongFile, setWrongFile] = useState(false);
  const stopExport = useRef<AbortController | null>(null);
  const rendering = !!exporting;
  useEffect(() => {
    if (!rendering) return;
    const stay = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", stay);
    return () => removeEventListener("beforeunload", stay);
  }, [rendering]);

  const saveLook = (body: object) =>
    fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  // A new style starts from its own look; the project's layers, logo, canvas, safe zone, languages and lines stay.
  /** Every caption back on the project's look (one undo step). */
  const ownLooks = cues.filter(hasOwnLook).length;
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
  // Highlight keywords: the colour, and whether the words also grow.
  const [hlColor, setHlColor] = useState("#FFD60A");
  const [hlBig, setHlBig] = useState(true);
  /** Every caption's keywords (lib/keywords.ts) in the colour picked, bigger and bold if chosen: one step to undo. */
  function autoHighlight() {
    commit(cues.map((c) => {
      let out = c;
      for (const ln of ["ta", "en"] as const) {
        const words = wordsOf(c[ln]);
        if (!words.length) continue;
        for (const j of pickKeywords(words)) out = setWord(out, ln, j, { color: hlColor, ...(hlBig ? { look: { size: 1.15, bold: true } } : {}) });
      }
      return out;
    }));
  }
  /** Every word back to its caption's look (colours, fonts, sizes picked out by hand or by Highlight keywords). */
  function clearHighlights() {
    if (!confirm("Take the colour, size and font off every picked-out word?")) return;
    commit(cues.map((c) => { const out = { ...c }; delete out.wc; delete out.wce; delete out.wf; delete out.wfe; return out; }));
  }
  /** A saved preset on this video: its style and look for every caption (the video's canvas, titles and logo stay). */
  function applyLook(p: Preset) {
    sameLook();
    const next = applyPreset(custom, p.custom);
    setStyleId(p.styleId);
    setCustom(next);
    savedLook.current = JSON.stringify(next);
    saveLook({ captionStyle: p.styleId, captionCustom: next });
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
  function addLayer(text: string, at = now) {
    const start = Math.max(0, Math.min(at, duration - 0.5));
    setLayers([...layers, { text, start, end: Math.min(duration, start + 3), x: 0.5, y: text.length <= 3 ? 0.4 : 0.25 }]);
    setSelLayer(layers.length);
    setTab("layers");
    return layers.length;
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

  useEffect(() => { latest.current = cues; }, [cues]);
  /** The captions to the server: true when they got there. */
  async function store() {
    setSaving(true);
    const sent = latest.current;
    const res = await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cues: sent }) }).catch(() => null);
    setSaving(false);
    if (res?.ok) setDirty(latest.current !== sent);
    else setMsg((await res?.json().catch(() => ({})))?.error || "Couldn't save. Check your connection; we'll try again with your next change.");
    return !!res?.ok;
  }
  async function save() {
    const ok = await store();
    if (ok) setMsg("Saved", 2000);
    return ok;
  }
  // Edits save themselves, quietly, a moment after they stop (not mid-drag).
  useEffect(() => {
    if (!dirty || saving) return;
    const id = setTimeout(() => { if (!dragFrom.current) store(); }, 2500);
    return () => clearTimeout(id);
  }, [cues, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // the sound's shape: measured on the server the first time, then stored
    let on = true;
    fetch(`/api/jobs/${job.id}/levels`).then((r) => r.json()).then((d) => { if (on && d.levels) setLevels(unpackLevels(d.levels)); }).catch(() => {});
    return () => { on = false; };
  }, [job.id]);

  // A moment after the captions or their look change, fit them to the video; at once for a new style.
  const fittedStyle = useRef(styleId);
  useEffect(() => {
    fitting.current = true;
    const id = setTimeout(() => setScan(Date.now()), fittedStyle.current === styleId ? 700 : 120);
    fittedStyle.current = styleId;
    return () => clearTimeout(id);
  }, [cues, custom, styleId, frameRatio, view, portrait]);
  useEffect(() => { // and again when a caption font arrives: until then the text was measured in a stand-in
    const again = () => { fitMemo.current.clear(); fitting.current = true; setScan(Date.now()); };
    document.fonts?.addEventListener("loadingdone", again);
    return () => document.fonts?.removeEventListener("loadingdone", again);
  }, []);
  // Auto zoom on the preview: the video (and its blurred backdrop) scaled on each caption's key word, as the MP4.
  const autoZoom = zoomOf(custom.zoom), zoomKey = autoZoom ? `${autoZoom.strength}/${autoZoom.style}` : "";
  const moments = useMemo(() => (zoomKey ? zoomMoments(cues, line) : []), [cues, line, zoomKey]);
  useEffect(() => {
    const v = video.current, bg = bgCanvas.current;
    if (!v) return;
    const z0 = zoomOf(custom.zoom);
    const apply = () => {
      const z = z0 ? zoomAt(v.currentTime, moments, z0) : 1;
      v.style.transform = z === 1 ? "" : `scale(${z.toFixed(4)})`;
      if (bg) bg.style.transform = z === 1 ? "" : `scale(${(1.12 * z).toFixed(4)})`;
    };
    let raf = 0;
    const tick = () => { apply(); if (!v.paused) raf = requestAnimationFrame(tick); };
    const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const evs = ["play", "pause", "seeked", "timeupdate"];
    for (const e of evs) v.addEventListener(e, kick);
    apply();
    return () => { cancelAnimationFrame(raf); for (const e of evs) v.removeEventListener(e, kick); v.style.transform = ""; if (bg) bg.style.transform = ""; };
  }, [moments, zoomKey, src, custom.canvas]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Pick the next caption that goes outside the video (and show it). */
  function showOutside() {
    if (!outside.length) return;
    const next = outside.find((i) => i > selected) ?? outside[0];
    video.current?.pause();
    seek(cues[next].start + Math.min(0.5, (cues[next].end - cues[next].start) / 2));
    select(next);
  }
  /** One tap: the Export tab, and the video made unless the last one is current. */
  function exportNow() {
    setTab("export");
    if (rendering || (made && !dirty && !lookChanged) || !videoHere) return;
    void render();
  }
  async function render() {
    const waited = fitting.current; // a change just made: let its fit land, so the MP4 has it
    for (let n = 0; fitting.current && n < 30; n++) await new Promise((r) => setTimeout(r, 100));
    const off = outsideNow.current.length;
    if (off && !confirm(`${off} subtitle${off === 1 ? " goes" : "s go"} outside the video and will be cut off in the MP4. Export anyway?`)) return;
    if ((dirty || waited) && !(await store())) return;
    await saveLook({ captionStyle: styleId, captionCustom: custom });
    // The editor reached without a page load isn't isolated yet, and would export on one thread: load it and carry on.
    if (!self.crossOriginIsolated && !local) { location.assign(`${location.pathname}?export=${view}`); return; }
    await makeVideo(view);
  }
  async function makeVideo(lang: string) {
    setExportError("");
    setExporting({ step: "Getting ready", pct: 0 });
    const stop = (stopExport.current = new AbortController());
    try {
      const { renderOnDevice } = await import("@/lib/deviceExport");
      const blob = await renderOnDevice({
        video: localVideo(job.id)?.file ?? `/api/jobs/${job.id}/media`, logo: custom.logo ? `/api/jobs/${job.id}/logo` : undefined,
        signal: stop.signal, onStep: setExporting,
        plan: async (video) => {
          const res = await fetch(`/api/jobs/${job.id}/render`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ style: styleId, lang, video }) });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new ExportRefused(body.error || "Couldn't start the export.");
          return body;
        },
      });
      if (made) URL.revokeObjectURL(made.url);
      const file = { url: URL.createObjectURL(blob), name: `${stem(job.filename)}.${styleId}.mp4` };
      setMade(file);
      setRenderedLook(JSON.stringify([styleId, custom]));
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name;
      a.click();
      void fetch(`/api/jobs/${job.id}/render`, { method: "PUT" }).catch(() => {});
    } catch (e) {
      console.error(e);
      if (e instanceof ExportRefused) setExportError(e.message);
      else if (!stop.signal.aborted) setExportError("This device couldn't finish the video. It may be too long for this device's memory: close other apps and try again, or export on a computer.");
    } finally {
      setExporting(null);
    }
  }
  // Back from the page load render() asked for.
  const resumed = useRef(false);
  useEffect(() => {
    const lang = new URLSearchParams(location.search).get("export");
    if (!lang || resumed.current) return;
    resumed.current = true;
    history.replaceState(null, "", location.pathname);
    setTab("export");
    void makeVideo(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- playback ----------
  /** The video's shape and length (the preview and timeline match it). */
  function metadata(v: HTMLVideoElement) {
    setPortrait(v.videoHeight > v.videoWidth);
    if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
    if (v.duration) setDuration(v.duration);
  }
  // The blurred background (canvas "fit" on blur): the main video's picture, painted small (it's blurred anyway)
  // about 12 times a second. Not a second copy of the video: that downloaded it twice and kept seeking to follow.
  const blurBg = !!(shaped && cv!.fit === "fit" && cv!.bg === "blur");
  useEffect(() => {
    if (!blurBg) return;
    let raf = 0, last = 0;
    const paint = (at: number) => {
      raf = requestAnimationFrame(paint);
      const v = video.current, c = bgCanvas.current;
      if (!v || !c || !v.videoWidth || at - last < 80) return;
      last = at;
      c.width = 64; c.height = Math.max(1, Math.round((64 * v.videoHeight) / v.videoWidth));
      try { c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height); } catch { /* not readable yet */ }
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [blurBg]);
  // The video can be ready before this page's scripts are: then loadedmetadata already fired.
  useEffect(() => { const v = video.current; if (v && v.readyState >= 1) metadata(v); }, []);
  useEffect(() => {
    const v = video.current;
    if (!playing || !v?.requestVideoFrameCallback || v.playbackRate !== 1) return; // sped up, frames get skipped
    let id = 0, last = -1;
    const gaps: number[] = [];
    const seen: VideoFrameRequestCallback = (_, m) => {
      if (last >= 0 && m.mediaTime > last) gaps.push(m.mediaTime - last);
      last = m.mediaTime;
      if (gaps.length >= 20) { setFrame(gaps.sort((a, b) => a - b)[10]); return; } // the middle one: dropped frames don't count
      id = v.requestVideoFrameCallback(seen);
    };
    id = v.requestVideoFrameCallback(seen);
    return () => v.cancelVideoFrameCallback(id);
  }, [playing, src]);
  const seek = (t: number) => { const v = video.current; if (v) v.currentTime = Math.max(0, Math.min(t, (v.duration || duration) - 0.01)); setNow(t); };
  const togglePlay = () => { const v = video.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };

  // Full screen (computers): the player with its captions, at the size they'll really be seen. The video element alone
  // would leave the captions behind, as they're drawn over it. The controls fade when the mouse rests, to see the whole frame.
  const fullBox = useRef<HTMLDivElement>(null);
  const canFull = useSyncExternalStore(subscribeNever, () => !!document.fullscreenEnabled, () => false);
  const [full, setFull] = useState(false);
  const [resting, setResting] = useState(false);
  const restTimer = useRef(0);
  const stir = (e: React.PointerEvent) => { // (not while the mouse is on the controls: they stay until it leaves)
    setResting(false);
    clearTimeout(restTimer.current);
    if (!(e.target as Element).closest(".fs-bar")) restTimer.current = window.setTimeout(() => setResting(true), 2500);
  };
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  useEffect(() => { if (video.current) { video.current.volume = volume; video.current.muted = muted; } }, [volume, muted, src]);
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else fullBox.current?.requestFullscreen().catch(() => {}); };
  useEffect(() => {
    const change = () => {
      setFull(!!document.fullscreenElement);
      setResting(false);
      clearTimeout(restTimer.current);
      if (document.fullscreenElement) restTimer.current = window.setTimeout(() => setResting(true), 2500);
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  // Playback speed: the button next to Play cycles it; pressing and holding the video plays at 2× until let go (as
  // on YouTube). A hold on a paused video plays it while held. The click that ends a hold doesn't also pause.
  const [speed, setSpeed] = useState(1);
  const [fast, setFast] = useState(false);
  const hold = useRef<{ timer: number; on: boolean; wasPaused: boolean } | null>(null);
  const afterHold = useRef(false);
  useEffect(() => { if (video.current) video.current.playbackRate = fast ? 2 : speed; }, [speed, fast, src]);
  const holdStart = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const h = { timer: 0, on: false, wasPaused: true };
    h.timer = window.setTimeout(() => {
      const v = video.current;
      if (!v) return;
      h.on = true; h.wasPaused = v.paused;
      setFast(true);
      if (v.paused) v.play().catch(() => {});
    }, 350);
    hold.current = h;
  };
  const holdEnd = () => {
    const h = hold.current;
    if (!h) return;
    clearTimeout(h.timer);
    hold.current = null;
    if (!h.on) return;
    setFast(false);
    if (h.wasPaused) video.current?.pause();
    afterHold.current = true;
  };
  const clickVideo = () => { if (afterHold.current) { afterHold.current = false; return; } togglePlay(); };
  const activeIdx = cues.findIndex((c) => now >= c.start && now < c.end);
  /** Paused: the caption on screen becomes the one being edited (the Caption panel, the list), as a click on it would. */
  const pausedAt = (t: number) => {
    const i = cues.findIndex((c) => t >= c.start && t < c.end);
    if (i < 0 || i === selected) return;
    setSelected(i);
    list.current?.children[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
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
  // Translate: the language picked (open while set), and the request running.
  const [translateTo, setTranslateTo] = useState<string | null>(null);
  // The minutes left, read when a translation or a remake is being thought about (both use the video's length).
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (translateTo === null) return;
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => typeof d?.secondsLeft === "number" && setLeft(d.secondsLeft)).catch(() => {});
  }, [translateTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const cost = Math.ceil(initial.durationSec || 0);
  const costLine = `Uses ${minSec(cost)} of your minutes (the video's length)${left !== null ? `; you have ${minSec(left)} left` : ""}.`;
  const short_ = left !== null && cost > left;
  const [translating, setTranslating] = useState(false);
  async function translate() {
    if (!translateTo) return;
    setTranslating(true);
    if (dirty && !(await save())) { setTranslating(false); return; } // the translation starts from what's saved
    const res = await fetch(`/api/jobs/${job.id}/translate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: translateTo }) });
    const r = await res.json().catch(() => ({}));
    setTranslating(false);
    if (!res.ok) { setTranslateTo(null); setMsg(r.error || "Couldn't translate."); return; }
    setDirty(false);
    setTimeout(() => window.location.reload(), 50); // the captions, the project's language and the minutes left come back new
  }
  const [retype, setRetype] = useState<{ type: CaptionType; withEnglish: boolean } | null>(null);
  useEffect(() => {
    if (retype) fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => typeof d?.secondsLeft === "number" && setLeft(d.secondsLeft)).catch(() => {});
  }, [!!retype]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (i >= 0) { setSelLayer(-1); setTab("caption"); list.current?.children[i]?.scrollIntoView({ block: "nearest" }); }
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
  /** What's picked on the timeline given a new span: the text layer, else the caption (the others make room). */
  function setSpan(start: number, end: number) {
    if (layers[selLayer]) {
      const s = Math.max(0, Math.min(start, end - MIN_CAPTION));
      editLayer(selLayer, { start: s, end: Math.min(duration, Math.max(end, s + MIN_CAPTION)) });
      return;
    }
    const i = target();
    if (i >= 0) commit(retime(cues, i, start, end, duration));
  }
  /** Moved a little, seconds; with "move later captions too", those go with it. */
  function moveBy(d: number) {
    const l = layers[selLayer], i = target();
    if (l) { const s = Math.max(0, Math.min(l.start + d, duration - (l.end - l.start))); editLayer(selLayer, { start: s, end: s + l.end - l.start }); }
    else if (i >= 0) commit(ripple ? shiftFrom(cues, i, d, duration) : retime(cues, i, cues[i].start + d, cues[i].end + d, duration));
  }
  const picked = () => layers[selLayer] ?? cues[target()];
  /** A text layer deleted (from the timeline's bar, the Delete key, or the Layers list). */
  function removeLayer(i: number) {
    if (!layers[i]) return;
    setLayers(layers.filter((_, j) => j !== i));
    setSelLayer(-1);
  }
  function remove(i = target()) {
    if (i < 0) return;
    commit(removeCue(cues, i)); // its neighbours take its time back when they touched it
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
  function tapCaption(start: number, word?: number) {
    const t = Math.max(start, now);
    let i = cues.findIndex((c) => t >= c.start - 0.01 && t < c.end);
    if (i < 0) i = cues.findIndex((c) => c.end > start);
    if (i < 0) return;
    if (i !== selected) { setInline(false); setNudging(false); }
    select(i);
    const regrouped = view === "en" && cues.some((c) => c.ta); // English captions regrouped: their words aren't one caption's
    setPickedWord({ cue: i, j: word !== undefined && !regrouped ? word : wordAt(i, Math.max(now, cues[i].start)) });
    setWordBar(word !== undefined && !regrouped);
  }
  /** A change to the word picked on the video: its own look and/or colour. */
  function styleWord(patch: { look?: WordLook | null; color?: string | null }) {
    if (!pickedWord) return;
    const c = cues[pickedWord.cue];
    if (c) editCue(pickedWord.cue, setWord(c, line, pickedWord.j, patch));
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
  /** Move the selected caption's start or end by d seconds (the captions next to it make room). */
  function nudge(edge: "start" | "end", d: number) {
    const i = target(), c = cues[i];
    if (!c) return;
    commit(edge === "start" ? retime(cues, i, Math.min(c.start + d, c.end - MIN_CAPTION), c.end, duration) : retime(cues, i, c.start, Math.max(c.end + d, c.start + MIN_CAPTION), duration));
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
      else if (k === "Delete" || k === "Backspace") { e.preventDefault(); if (tab === "layers" && layers[selLayer]) removeLayer(selLayer); else remove(); } // the text picked, else the caption
      else if (k === "ArrowLeft") { e.preventDefault(); seek(now - (e.shiftKey ? 1 : frame)); }
      else if (k === "ArrowRight") { e.preventDefault(); seek(now + (e.shiftKey ? 1 : frame)); }
      else if (k === "ArrowUp" || k === "ArrowDown") {
        e.preventDefault();
        const i = Math.max(0, Math.min(cues.length - 1, (selected < 0 ? activeIdx : selected) + (k === "ArrowUp" ? -1 : 1)));
        if (cues[i]) { select(i); seek(cues[i].start); }
      }
      else if (k === "+" || k === "=") setZoom((z) => Math.min(600, z * 1.25));
      else if (k === "-" || k === "_") setZoom((z) => Math.max(10, z / 1.25));
      else if (k === "[" && picked()) setSpan(now, picked().end);
      else if (k === "]" && picked()) setSpan(picked().start, now);
      else if (k === "," || k === "<") moveBy(-(e.shiftKey ? 10 : 1) * frame);
      else if (k === "." || k === ">") moveBy((e.shiftKey ? 10 : 1) * frame);
      else if (k === "g" || k === "G") setGuides((g) => !g);
      else if ((k === "f" || k === "F") && canFull && src) toggleFull();
      else if (k === "Escape") { setSelected(-1); setSelLayer(-1); setPickedWord(null); setNudging(false); }
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
        <FlowSteps at={3} />
        <h1>{stem(job.filename)}</h1>
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
            <p className="muted">{job.status === "queued" ? "Waiting in line…" : `Making your subtitles · ${job.progress}%${eta ? ` · about ${eta < 60 ? `${Math.max(5, Math.ceil(eta / 5) * 5)} seconds` : `${Math.ceil(eta / 60)} min`} left` : ""}.`} The editor opens here by itself when they&apos;re ready. You can leave this page; we&apos;ll keep working.</p>
            {canNotify && (notify
              ? <p className="muted small">We&apos;ll tell you when they&apos;re ready, even in another tab.</p>
              : <button className="btn ghost small" onClick={async () => { try { if ((await Notification.requestPermission()) === "granted") setNotify(true); } catch { /* not supported */ } }}>Tell me when it&apos;s ready</button>)}
          </>
        )}
      </div>
    );
  }

  const sel = cues[selected];
  const sample = sel ?? cues.find((c) => (c.ta || c.en).trim()); // the caption the style previews play (none picked yet: the first)
  /** A small still of the video where it is now, for the style previews' background (none if it can't be read). */
  const videoStill = () => {
    const v = video.current;
    if (!v?.videoWidth) return undefined;
    try {
      const c = document.createElement("canvas"), k = 360 / Math.max(v.videoWidth, v.videoHeight);
      c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.7);
    } catch { return undefined; } // a video from elsewhere can't be read back
  };
  const selLook = sel ? resolveStyle(styleId, mergeCustom(custom, sel.style), portrait) : look;
  const words = sel ? wordsOf(sel[line]) : [];
  const starts = sel ? startsOf(sel, line) : [];
  const colors = sel ? (line === "en" ? sel.wce : sel.wc) : undefined;
  const own = sel?.style ?? {};

  return (
    <div className="editor ed" data-pane={pane} data-sheet={sheet || undefined}>
      <div className="ed-flow">
        <FlowSteps at={tab === "export" ? 4 : 3} />
        {!hintGone && <p className="ed-hint">
          <span><b>Edit:</b> tap a caption on the video or in the list to change its words; press and hold a word to style it.</span>
          <span><b>Style:</b> pick a look and change colours, fonts and size.</span>
          <span><b>Export:</b> get the video with captions, or SRT / VTT files.</span>
          <button className="ed-hint-x" onClick={() => { setHintGone(true); try { localStorage.setItem("vs-editor-hint", "1"); } catch { /* private mode */ } }} aria-label="Hide these tips">×</button>
        </p>}
      </div>
      <div className="ed-top">
        <div className="ed-title">
          <Link href="/app" className="muted">Projects</Link>
          <div className="ed-name">
            <h1 className="page-title">{stem(job.filename)}</h1>
            <button className="ed-rename" aria-label="Rename project" title="Rename project" onClick={() => setRenaming(true)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" /></svg></button>
          </div>
          {renaming && <RenameProject id={job.id} filename={job.filename} onClose={() => setRenaming(false)} onRenamed={(filename) => setJob((j) => ({ ...j, filename }))} />}
          <button className="ctype-chip" onClick={() => setRetype(typeOf(initial))} title="Change what the captions say and how they're written">
            <span className="muted">Captions:</span> <strong>{typeLabel(initial, language.name)}</strong> <span className="ctype-go">Change type</span>
          </button>
          <button className="ctype-chip" onClick={() => setTranslateTo(job.language === "en-IN" ? "hi-IN" : cues.some((c) => c.en.trim()) ? (job.language === "hi-IN" ? "ta-IN" : "hi-IN") : "en-IN")} title="Translate the captions into another language">
            <span aria-hidden="true">🌐</span> <span className="ctype-go">Translate</span>
          </button>
        </div>
        {translateTo && createPortal(
          <div className="modal-back" onClick={(e) => e.target === e.currentTarget && !translating && setTranslateTo(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-label="Translate captions">
              <h2>Translate captions</h2>
              <label className="insp-field">Into
                <select value={translateTo} onChange={(e) => setTranslateTo(e.target.value)} disabled={translating}>
                  <option value="en-IN">English (the English line)</option>
                  {LANGUAGES.filter((l) => l.code !== job.language || cues.some((c) => c.en.trim())).map((l) => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}
                </select>
              </label>
              <p className="muted small">
                {translateTo === "en-IN"
                  ? `The ${language.name} line is translated into English${cues.some((c) => c.en.trim()) ? ", replacing the English line" : " and shown under it"}.`
                  : `The ${language.name} line becomes ${languageOf(translateTo).name}, translated from ${cues.some((c) => c.en.trim()) ? "the English line" : `the ${language.name} line`}. Timing and style stay; word colours on that line are cleared.`}
                {" "}To go back, translate again or use Change type.
              </p>
              <p className={`small${short_ ? " error" : ""}`}><b>{costLine}</b>{short_ ? " Not enough minutes: upgrade on Billing." : ""}</p>
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setTranslateTo(null)} disabled={translating}>Cancel</button>
                <button className="btn" onClick={translate} disabled={translating || short_}>{translating ? "Translating…" : "Translate"}</button>
              </div>
            </div>
          </div>, document.body,
        )}
        {retype && createPortal(
          <div className="modal-back" onClick={(e) => e.target === e.currentTarget && !retyping && setRetype(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-label="Change caption type">
              <h2>Change caption type</h2>
              <CaptionTypePicker language={language.name} tamil={short === "ta"} type={retype.type} withEnglish={retype.withEnglish}
                onChange={(type, withEnglish) => setRetype({ type, withEnglish })} disabled={retyping} />
              <p className="muted small">
                Some changes are instant (like hiding the English line). Others make the captions again from your video:
                that takes a minute or two and replaces your text edits (your style stays).{dirty ? " Unsaved changes will be lost." : ""}
              </p>
              <p className={`small${short_ ? " error" : ""}`}><b>Making them again: {costLine}</b>{short_ ? " Not enough minutes: upgrade on Billing." : ""} Instant changes use nothing.</p>
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
          <span className="muted save-msg" aria-live="polite">{msg || (dirty ? "Unsaved changes" : "All changes saved")}</span>
          <button className="btn ghost" onClick={() => setFinding((f) => !f)} aria-pressed={finding} title="Find and replace words in all captions">Find</button>
          <button className="btn ghost" onClick={save} disabled={!dirty || saving} title="Save (⌘S)">{saving ? "Saving…" : "Save"}</button>
          <button className="btn" onClick={exportNow} disabled={rendering} title="Make the video with captions on this device (it downloads when ready)">{rendering ? `Exporting · ${exporting.pct}%` : "Export video"}</button>
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
                {hasOwnLook(c) && <span className="chip-own" title="This caption has its own style">Own style</span>}
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
            <button className={`ib-save${dirty ? " on" : ""}`} onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : dirty ? "Save" : "Saved"}</button>
            <button className="ib-export" onClick={() => { openPane("export"); exportNow(); }} disabled={rendering}>{rendering ? `${exporting.pct}%` : "Export"}</button>
          </div>
          <div ref={fullBox} className="ed-frame" data-resting={full && resting ? "" : undefined} onPointerMove={full ? stir : undefined}>
          {!playing && !sheet && (
            <div className="vrail vrail-phone" role="toolbar" aria-label="Add and change">
              <button onClick={() => { addLayer("Your text"); openPane("layers"); }}><Icon name="title" />Add title</button>
              <button onClick={() => openPane("style")}><Icon name="style" />Caption style</button>
              <button onClick={() => openPane("timeline")}><Icon name="timeline" />Timeline</button>
              <button onClick={() => setFinding(true)}><Icon name="find" />Find</button>
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
              {blurBg && <canvas ref={bgCanvas} className="bg-blur" aria-hidden="true" />}
              <video ref={video} src={src} preload="auto" playsInline onClick={clickVideo} onPointerDown={holdStart} onPointerUp={holdEnd}
                onPointerCancel={holdEnd} onPointerLeave={holdEnd} onContextMenu={(e) => e.preventDefault()} onLoadedData={(e) => { e.currentTarget.playbackRate = speed; }} style={shaped ? { objectFit: cv!.fit === "fill" ? "cover" : "contain" } : undefined}
                onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={(e) => { setPlaying(false); pausedAt(e.currentTarget.currentTime); }}
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
              {fast && <span className="fast-badge" role="status">2× ▶▶</span>}
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
              <LiveCaption video={video} cues={view === "en" && cues.some((c) => c.ta) ? englishCues(cues) : cues} styleId={hoverStyle ?? styleId} custom={hoverStyle ? projectOnly(custom) : custom} portrait={portrait} ratio={frameRatio} view={view} selected={selected}
                // The picked caption gets a dashed box (in the English view captions are regrouped: the one holding it).
                picked={(start) => !playing && !!sel && (view === "en" ? start <= sel.start + 0.01 && now >= sel.start - 0.01 && now < sel.end : Math.abs(start - sel.start) < 0.001)}
                editing={inline && cues[target()] ? cues[target()][line] : null}
                onTap={tapCaption} onEditOpen={() => { setWordBar(false); setInline(true); }} onEditDone={inlineDone}
                wordBar={wordBar && pickedWord && !playing ? pickedWord : null} onWord={styleWord} onWordClose={() => setWordBar(false)}
                onLook={(patch, all) => { if (all) lookAll(patch); else { const i = target(); if (i >= 0) styleCue(i, patch); } }}
                onMove={(i, x, y) => { if (onlyThis && i === selected) styleCue(i, { x, y }); else lookAll({ x, y }); }}
                onResize={(i, size) => { if (onlyThis && i === selected) styleCue(i, { size }); else lookAll({ size }); }} />
              {freePlan && <span className="wm-preview" aria-hidden="true">Made with {BRAND.name}</span>}
              {canFull && !full && <button className="fs-open" onClick={toggleFull} aria-label="Full screen" title="Full screen (F)"><Icon name="expand" /></button>}
              {scan > 0 && <FitScan key={scan} cues={cues} styleId={styleId} custom={custom} portrait={portrait} ratio={frameRatio} view={view} memo={fitMemo.current} onDone={scanDone} />}
            </div>
          ) : (
            coming ? (
              // The video stays on the device, so a reopened page asks for the file again.
              <div className="player gone"><p>Your video stays on your device. Choose the same file to keep working; your captions are saved.</p>
                <label className="btn small">Choose the video<input type="file" hidden accept="video/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size !== job.videoTotal) return setWrongFile(true);
                  setWrongFile(false);
                  keepVideo(job.id, f);
                }} /></label>
                {wrongFile && <p className="error">That&apos;s not the same file as this project&apos;s (its size is different).</p>}
              </div>
            ) : <div className="player gone"><p>The video was removed after 7 days. Your subtitles are still here.</p></div>
          )}
          {full && (
            <div className="fs-bar" role="toolbar" aria-label="Video controls">
              <div className="fs-row">
                <span className="tnum">{mmss(now)}</span>
                {/* let go of a slider afterwards, or Space and the arrows would stay with it */}
                <input type="range" aria-label="Position in the video" min={0} max={duration} step={0.01} value={Math.min(now, duration)}
                  style={{ "--fill": `${(Math.min(now, duration) / duration) * 100}%` } as React.CSSProperties}
                  onChange={(e) => seek(Number(e.target.value))} onPointerUp={(e) => e.currentTarget.blur()} />
                <span className="tnum">{mmss(duration)}</span>
              </div>
              <div className="fs-row">
                <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} title="Play / pause (Space)"><Icon name={playing ? "pause" : "play"} /></button>
                <button onClick={() => { if (muted && !volume) setVolume(1); setMuted(!muted); }} aria-label={muted ? "Sound on" : "Mute"} title={muted ? "Sound on" : "Mute"}>
                  <Icon name={muted ? "muted" : volume > 0.5 ? "volume" : "volumeLow"} />
                </button>
                <input className="fs-volume" type="range" aria-label="Volume" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                  style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                  onChange={(e) => { const v = Number(e.target.value); setVolume(v); setMuted(v === 0); }} onPointerUp={(e) => e.currentTarget.blur()} />
                <div className="fs-speeds" role="group" aria-label="Playback speed">
                  {[...SPEEDS].sort((a, b) => a - b).map((x) => <button key={x} aria-pressed={speed === x} onClick={() => setSpeed(x)}>{x}x</button>)}
                </div>
                <button onClick={toggleFull} aria-label="Exit full screen" title="Exit full screen (Esc)"><Icon name="shrink" /></button>
              </div>
            </div>
          )}
          </div>
          {outside.length > 0 && view !== "en" && (
            <div className="out-warn" role="alert">
              <span>⚠ {outside.length} subtitle{outside.length === 1 ? " goes" : "s go"} outside the video and will be cut off in the MP4.</span>
              <button className="btn small" onClick={showOutside}>Show {outside.length === 1 ? "it" : "next"}</button>
            </div>
          )}
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
                  {highlights(look) && <button onClick={highlight}><Icon name="mark" />Highlight</button>}
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
            <button className="btn ghost small ed-speed" onClick={() => setSpeed((x) => SPEEDS[(SPEEDS.indexOf(x) + 1) % SPEEDS.length])}
              title="Playback speed (or press and hold the video for 2×)" aria-label={`Playback speed ${speed}×`}>{speed}×</button>
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
            {([["caption", "Text"], ["style", "Style"], ["layers", "Titles & logo"], ["export", "Export"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="ed-side-body">{/* scrolls under the tabs, which stay put */}

          {tab === "caption" && (sel ? (
            <div className="insp">
              <div className="insp-row">
                <TimeInput key={`s${selected}-${sel.start}`} value={sel.start} label="Start" onChange={(v) => commit(retime(cues, selected, v, sel.end, duration))} />
                <TimeInput key={`e${selected}-${sel.end}`} value={sel.end} label="End" onChange={(v) => commit(retime(cues, selected, sel.start, v, duration))} />
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
                ? <LookControls look={selLook} own={own} set={(patch) => styleCue(selected, patch)} tamil={tamil} project={look} setAll={lookAll} />
                : <LookControls look={look} own={custom} set={lookAll} tamil={tamil} />}

              <h3>Words</h3>
              <p className="muted small">Edit a word, its start time (or drag it on the timeline) and its colour.</p>
              <ol className="insp-words">
                {words.map((w, j) => (
                  <li key={`${selected}-${j}-${w}`}>
                    <input className="w-text" lang={line === "ta" ? short : "en"} defaultValue={w} aria-label={`Word ${j + 1}`}
                      onBlur={(e) => { if (e.target.value !== w) editCue(selected, setWord(sel, line, j, { text: e.target.value })); }} />
                    <TimeInput key={`w${selected}-${j}-${starts[j]}`} value={starts[j]} label={`Word ${j + 1} start`} onChange={(v) => editCue(selected, setWord(sel, line, j, { start: v }))} />
                    <ColorPicker value={hex(colors?.[j] ?? undefined, hex(selLook.color, "#ffffff"))} onChange={(c) => editCue(selected, setWord(sel, line, j, { color: c }))} label={`Word ${j + 1} colour`} />
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
                      <button className="link small" onClick={(e) => { e.stopPropagation(); removeLayer(i); }}>Delete</button>
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
              <h3>Project style</h3>
              <p className="muted small">{styleOf(styleId).blurb} Applies to every caption without its own look.</p>
              <StylePicker styleId={styleId} onPick={pickStyle} onHover={setHoverStyle} text={sample ? sample.en || sample.ta : undefined} frame={videoStill} />
              <h3>Font</h3>
              {/* Every font, written in itself: one tap sets it for the captions (the style's own font is "Style's"). */}
              <div className="font-chips" role="radiogroup" aria-label="Font">
                <button role="radio" aria-checked={!custom.font} onClick={() => tweak({ font: undefined })}>
                  <span style={{ fontFamily: look.font }}>Aa</span><small>Style&apos;s</small>
                </button>
                {[...NEW_FONTS, ...CAPTION_FONTS.filter((f) => !NEW_FONTS.includes(f))].map((f) => ( // the new ones first
                  <button key={f} role="radio" aria-checked={custom.font === f} onClick={() => tweak({ font: f })}>
                    <span style={{ fontFamily: `"${f}"` }}>Aa</span><small>{f}{FONT_LIKE[f] ? ` (${FONT_LIKE[f]})` : ""}</small>
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
              <Presets styleId={styleId} custom={custom} onApply={applyLook} />
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
                  {cv!.bg !== "blur" && <ColorPicker value={cv!.bg} onChange={(c) => tweak({ canvas: { ...cv!, bg: c } })} label="Background colour" />}
                </div>}
              </>}
              </div>

              <section className="auto-hl" aria-label="Highlight keywords">
                <div className="insp-head"><h3>Highlight keywords</h3></div>
                <p className="muted small">Picks the words that matter in every caption (numbers, money, names, strong words) and makes them stand out. Change any word after by tapping it on the video.</p>
                <div className="hl-opts">
                  <span className="hl-color">Colour<ColorPicker value={hlColor} onChange={setHlColor} label="Keyword colour" /></span>
                  <label className="hl-check"><input type="checkbox" checked={hlBig} onChange={(e) => setHlBig(e.target.checked)} /> Bigger and bold</label>
                </div>
                <div className="hl-acts">
                  <button className="btn small" onClick={autoHighlight} disabled={!cues.length}>Highlight keywords</button>
                  <button className="btn ghost small" onClick={clearHighlights} disabled={!cues.some((c) => c.wc || c.wce || c.wf || c.wfe)}>Clear word styles</button>
                </div>
                {!highlights(look) && <p className="muted small">This style shows no coloured words: the colour won&apos;t show, the size and bold will.</p>}
              </section>
              <section className="auto-zoom" aria-label="Auto zoom">
                <div className="insp-head"><h3>Auto zoom</h3>
                  <label className="cz-check"><input type="checkbox" checked={!!autoZoom} onChange={(e) => tweak({ zoom: e.target.checked ? { strength: 1.15, style: "punch" } : null })} /> On</label>
                </div>
                <p className="muted small">The video punches in on each caption&apos;s key word (a word you picked out first){autoZoom ? ` · ${moments.length} zoom${moments.length === 1 ? "" : "s"}` : ""}.</p>
                {autoZoom && <>
                  <label>Strength <span className="cz-val">{Math.round((autoZoom.strength - 1) * 100)}%</span>
                    <input type="range" min={1.03} max={1.4} step={0.01} value={autoZoom.strength} onChange={(e) => tweak({ zoom: { ...autoZoom, strength: +e.target.value } })} />
                  </label>
                  <div className="seg" role="group" aria-label="Zoom style">
                    <button aria-pressed={autoZoom.style === "punch"} onClick={() => tweak({ zoom: { ...autoZoom, style: "punch" } })}>Punch</button>
                    <button aria-pressed={autoZoom.style === "smooth"} onClick={() => tweak({ zoom: { ...autoZoom, style: "smooth" } })}>Smooth</button>
                  </div>
                </>}
              </section>
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
                  <span className="bar"><i style={{ width: `${Math.max(3, exporting.pct)}%` }} /></span>
                  <span className="muted small">{exporting.step}{exporting.pct ? ` · ${exporting.pct}%` : "…"}. Keep this tab open: the video is being made on this device.</span>
                  <button className="link" onClick={() => stopExport.current?.abort()}>Cancel</button>
                </div>
              ) : (
                <div className="insp-actions">
                  <button className="btn" onClick={render} disabled={!videoHere}>{coming ? "Choose the video first" : dirty ? "Save and export MP4" : "Export MP4"}</button>
                  {made && !dirty && !lookChanged && <a className="btn ghost" href={made.url} download={made.name}>Download MP4</a>}
                  {made && (dirty || lookChanged) && <>
                    <p className="muted small render-stale">Your last MP4 was made before your latest changes. Export again to get them in the video.</p>
                    <a className="btn ghost" href={made.url} download={made.name}>Download the older MP4</a>
                  </>}
                  {!made && (job.renderStatus === "done" || job.renderStatus === "stale") && <a className="btn ghost" href={`/api/jobs/${job.id}/render`} download>Download the older MP4</a>}
                  {freePlan && <p className="muted small wm-note">Free plan videos carry a small &ldquo;Made with {BRAND.name}&rdquo; mark. <a href="/pricing">Upgrade</a> to export without it.</p>}
                </div>
              )}
              {exportError && <p className="error">{exportError}</p>}
              <p className="muted small">Burns in {view === "both" ? `${language.name} + English` : view === "en" ? "English" : language.name} (the language shown under the video), with every caption&apos;s own look. {coming ? "Choose your video file above, then export." : !videoHere && "The video was removed after 7 days, so it can't be exported."}</p>

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
        <Timeline cues={cues} duration={duration} now={now} selected={layers[selLayer] ? -1 : selected} zoom={zoom} line={line} playing={playing} video={video} src={src} levels={levels} frame={frame}
          onSeek={seek} onSelect={select} onZoom={setZoom}
          onAddCaption={(t) => { // a caption where the timeline was double-clicked (or the playhead), typed into there
            const r = insertAt(cues, t, duration);
            if (r.index < 0) { setMsg("No room there: the captions around it are already short. Shorten one, then try again."); return -1; }
            commit(r.cues); select(r.index); seek(r.cues[r.index].start + 0.01);
            return r.index;
          }}
          onDelete={(i) => remove(i)}
          onDeleteLayer={removeLayer}
          onDeselect={() => { setSelected(-1); setSelLayer(-1); setPickedWord(null); }}
          onInsertBetween={(j) => { // a caption between two (they usually touch): room from both sides
            const r = insertBetween(cues, j, duration);
            if (r.index < 0) { setMsg("No room there: the captions on both sides are already short. Shorten one, then try again."); return -1; }
            commit(r.cues); select(r.index); seek(r.cues[r.index].start + 0.01);
            return r.index;
          }}
          onAddText={(t) => { const i = addLayer("Your text", t); seek(Math.max(0, Math.min(t, duration - 0.5)) + 0.01); return i; }}
          onCaptionText={(i, text) => { const c = cues[i]; if (c && text.trim() !== c[line]) editCue(i, setText(c, line, text.trim())); }}
          onLayerText={(i, text) => editLayer(i, { text: text.trim() || "Your text" })}
          layers={layers.map((l) => ({ start: l.start, end: l.end, label: l.text }))} selectedLayer={selLayer}
          onSelectLayer={(i) => { setSelLayer(i); setTab("layers"); }} onDragLayer={(i, span) => editLayer(i, span)}
          onDrag={(next) => { if (!dragFrom.current) dragFrom.current = cues; setCuesRaw(next); }}
          ripple={ripple} onRipple={setRipple} onSpan={setSpan} onNudge={moveBy} onSplit={split} onMerge={merge}
          onDragEnd={() => { const from = dragFrom.current; dragFrom.current = null; if (from) { setPast((p) => [...p.slice(-199), from]); setFuture([]); setDirty(true); } }} />
      </div>

      {/* Phones: the editing actions within thumb's reach, and messages just above them. On the page body: inside
          the glass panels a fixed bar would stick to the panel, not the screen. */}
      {inBrowser && createPortal(<>
      {finding && <FindReplace cues={cues} onClose={() => setFinding(false)} onGo={(i) => { select(i); seek(cues[i].start + 0.01); }}
        onReplace={(next, n) => { commit(next); setMsg(`Replaced ${n}`, 2500); }} />}
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
  const keys: [string, string][] = [["Space", "Play / pause"], ["← →", "One frame (with ⇧: one second)"], ["↑ ↓", "Previous / next caption"], ["S", "Split at the playhead"], ["M", "Merge with the next"], ["[ ]", "Start / end the caption at the playhead"], [", .", "Move the caption one frame (with ⇧: ten)"], ["A", "Add a caption at the playhead"], ["Delete", "Delete the caption"], ["⌘Z / ⇧⌘Z", "Undo / redo"], ["⌘S", "Save"], ["+ / −", "Zoom the timeline"], ["G", "Centring guides on / off"], ["F", "Full screen"]];
  return (
    <dl className="keys">
      {keys.map(([k, v]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}
    </dl>
  );
}
