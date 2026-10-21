"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Cue } from "@/db/schema";
import { languageOf, shortCode } from "@/lib/languages";
import { CANVAS_RATIOS, CAPTION_STYLES, mergeCustom, resolveStyle, SAFE_ZONES, styleOf, type CanvasRatio, type CaptionCustom, type SafeZoneId, type TextLayer } from "@/lib/captionStyles";
import { insertAt, mergeCues, setText, setWord, splitCue, startsOf, wordsOf } from "@/lib/cueEdit";
import { englishCues } from "@/lib/subtitles";
import LookControls from "@/components/LookControls";
import StyledCaption from "@/components/StyledCaption";
import Timeline from "@/components/Timeline";
import "@/app/caption-styles.css";

type Job = {
  id: string; filename: string; language: string; status: string; progress: number; error: string | null;
  hasMedia: boolean; provider: string | null; model: string | null; cues: Cue[];
  captionStyle: string; captionCustom: CaptionCustom; renderStatus: string | null; renderProgress: number; renderError: string | null; renderLang: string;
};
type View = "ta" | "en" | "both";
type Tab = "caption" | "layers" | "style" | "export";
const GROUPS = ["Premiere", "Trending", "Aesthetic", "Clean", "Fun"] as const;
const RATIO = { "9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1, "16:9": 16 / 9 } as const;
const EMOJIS = ["😀", "😂", "🔥", "❤️", "👍", "🎉", "✨", "💯", "😍", "🙏", "👀", "⭐"];
const FRAME = 1 / 30;

/** The styled caption over the player, redrawn every frame while the video plays so word timing is smooth. */
function LiveCaption({ video, cues, styleId, custom, portrait, view, selected, onMove }: {
  video: React.RefObject<HTMLVideoElement | null>; cues: Cue[]; styleId: string; custom: CaptionCustom; portrait: boolean; view: View; selected: number;
  onMove: (i: number, x: number, y: number) => void;
}) {
  const [t, setT] = useState(0);
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
  const { position, offset, x, y, safe } = resolveStyle(styleId, own, portrait);
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
    video.current?.pause();
    e.preventDefault();
    const at = (ev: PointerEvent) => onMove(i,
      Math.min(0.95, Math.max(0.05, (ev.clientX - frame.left) / frame.width)),
      Math.min(0.95, Math.max(0.05, (ev.clientY - frame.top) / frame.height)),
    );
    const stop = () => { removeEventListener("pointermove", at); removeEventListener("pointerup", stop); };
    addEventListener("pointermove", at);
    addEventListener("pointerup", stop);
  };
  const line = view === "en" ? "en" : "ta";
  return (
    <div className={`overlay styled${free ? " free" : ""}${ghost ? " ghost" : ""}`} style={place}>
      <div className="drag-handle" onPointerDown={drag} title="Drag to move the subtitle">
        <StyledCaption styleId={styleId} custom={own} text={main} sub={view === "both" ? c.en : undefined} start={c.start} end={c.end} time={ghost ? c.end - 0.01 : t}
          starts={line === "en" ? c.we : c.w} colors={line === "en" ? c.wce : c.wc} />
      </div>
    </div>
  );
}

/** Text layers over the video at time t (the selected one also while paused outside its time, so it can be placed). */
function LayerViews({ layers, t, paused, styleId, custom, selected, onSelect, onMove }: {
  layers: TextLayer[]; t: number; paused: boolean; styleId: string; custom: CaptionCustom; selected: number;
  onSelect: (i: number) => void; onMove: (i: number, x: number, y: number) => void;
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
  const at = (ev: PointerEvent) => onMove(Math.min(0.98, Math.max(0.02, (ev.clientX - frame.left) / frame.width)), Math.min(0.98, Math.max(0.02, (ev.clientY - frame.top) / frame.height)));
  const stop = () => { removeEventListener("pointermove", at); removeEventListener("pointerup", stop); };
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
  const [msg, setMsg] = useState("");
  const hasEnglish = initial.cues.some((c) => c.en);
  // What the subtitles show (the project's choice from upload, changed with the buttons under the video): the
  // preview, the MP4 and the default download all follow it.
  const shown = initial.captionCustom?.show;
  const [view, setViewState] = useState<View>(!hasEnglish ? "ta" : shown ?? "both");
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(Math.max(1, ...initial.cues.map((c) => c.end)));
  const [selected, setSelected] = useState(-1);
  const [selLayer, setSelLayer] = useState(-1);
  const [logoVer, setLogoVer] = useState(0); // bumps the logo image URL after an upload
  const bgVideo = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<Tab>("caption");
  const [zoom, setZoom] = useState(80); // timeline px per second
  const [lang, setLang] = useState<View>(!hasEnglish ? "ta" : shown ?? "both");
  const [fmt, setFmt] = useState("srt");
  const [styleId, setStyleId] = useState(initial.captionStyle || "minimal");
  const [custom, setCustom] = useState<CaptionCustom>(initial.captionCustom ?? {});
  const [portrait, setPortrait] = useState(false);
  const [ratio, setRatio] = useState(16 / 9);
  const [showZones, setShowZones] = useState(false);
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
  function pickStyle(id: string) {
    setStyleId(id);
    setCustom({});
    savedLook.current = "{}";
    saveLook({ captionStyle: id, captionCustom: {} });
  }
  const savedLook = useRef(JSON.stringify(initial.captionCustom ?? {}));
  useEffect(() => {
    const now = JSON.stringify(custom);
    if (now === savedLook.current) return; // only real changes are saved
    const t = setTimeout(() => { savedLook.current = now; saveLook({ captionCustom: custom }); }, 400);
    return () => clearTimeout(t);
  }, [custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const tweak = (patch: CaptionCustom) => setCustom((c) => ({ ...c, ...patch }));
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
    if (res.ok) { setDirty(false); setMsg("Saved"); setTimeout(() => setMsg(""), 2000); }
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
  /** Change the selected caption's own look; an empty look falls back to the project's. */
  function styleCue(i: number, patch: CaptionCustom | null) {
    const c = cues[i];
    const next = patch === null ? undefined : { ...c.style, ...patch };
    if (next) for (const k of Object.keys(next) as (keyof CaptionCustom)[]) if (next[k] === undefined) delete next[k];
    const out: Cue = { ...c };
    if (next && Object.keys(next).length) out.style = next; else delete out.style;
    editCue(i, out);
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
      else if (k === "Escape") setSelected(-1);
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
            <div className="bar big" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(job.progress, 3)}%` }} /></div>
            <p className="muted">{job.status === "queued" ? "Waiting in line…" : `Listening and writing subtitles — ${job.progress}%`} You can leave this page; we&apos;ll keep working.</p>
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
    <div className="editor ed">
      <div className="ed-top">
        <div className="ed-title">
          <Link href="/app" className="muted">Projects</Link>
          <h1 className="page-title">{job.filename}</h1>
        </div>
        <div className="ed-tools" role="toolbar" aria-label="Edit">
          <button className="btn ghost small" onClick={undo} disabled={!past.length} title="Undo (⌘Z)">Undo</button>
          <button className="btn ghost small" onClick={redo} disabled={!future.length} title="Redo (⇧⌘Z)">Redo</button>
          <span className="muted save-msg" aria-live="polite">{msg || (dirty ? "Unsaved changes" : "All changes saved")}</span>
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
              </div>
              <textarea lang={short} rows={1} value={c.ta} onChange={(e) => editCue(i, setText(c, "ta", e.target.value))} aria-label={`${language.name} subtitle ${i + 1}`} />
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
          {job.hasMedia || mediaUrl ? (
            <div className="player" style={{ aspectRatio: frameRatio, width: `min(100%, ${(56 * frameRatio).toFixed(2)}vh)`, background: shaped && cv!.fit === "fit" && cv!.bg !== "blur" ? cv!.bg : undefined }}>
              {shaped && cv!.fit === "fit" && cv!.bg === "blur" && <video ref={bgVideo} className="bg-blur" src={mediaUrl ?? `/api/jobs/${job.id}/media`} muted playsInline preload="metadata" aria-hidden="true" />}
              <video ref={video} src={mediaUrl ?? `/api/jobs/${job.id}/media`} preload="metadata" onClick={togglePlay} style={shaped ? { objectFit: cv!.fit === "fill" ? "cover" : "contain" } : undefined}
                onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                onLoadedMetadata={(e) => metadata(e.currentTarget)} />
              {showZones && (["top", "right", "bottom", "left"] as const).map((k) => <i key={k} className={`zone zone-${k}`} style={{ [k === "top" || k === "bottom" ? "height" : "width"]: `${look.safe[k] * 100}%` }} />)}
              <LayerViews layers={layers} t={now} paused={!playing} styleId={styleId} custom={custom} selected={tab === "layers" ? selLayer : -1}
                onSelect={(i) => { setSelLayer(i); setTab("layers"); }} onMove={(i, x, y) => editLayer(i, { x, y })} />
              {custom.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={`logo-view${tab === "layers" ? " on" : ""}`} alt="Logo" src={`/api/jobs/${job.id}/logo?v=${logoVer}`} draggable={false}
                  style={{ left: `${custom.logo.x * 100}%`, top: `${custom.logo.y * 100}%`, width: `${custom.logo.size * 100}%`, opacity: custom.logo.opacity }}
                  onPointerDown={(e) => { setTab("layers"); dragIn(e, (x, y) => tweak({ logo: { ...custom.logo!, x, y } })); }} />
              )}
              <LiveCaption video={video} cues={view === "en" && cues.some((c) => c.ta) ? englishCues(cues) : cues} styleId={styleId} custom={custom} portrait={portrait} view={view} selected={selected}
                onMove={(i, x, y) => { if (tab === "caption" && i === selected) styleCue(i, { x, y }); else tweak({ x, y }); }} />
            </div>
          ) : (
            <div className="player gone"><p>The video was removed after 7 days. Your subtitles are still here.</p></div>
          )}
          <div className="ed-transport" role="toolbar" aria-label="Playback and editing">
            <button className="btn small" onClick={togglePlay} title="Play / pause (Space)">{playing ? "Pause" : "Play"}</button>
            <span className="tnum ed-time">{tc(now)} / {tc(duration)}</span>
            <span className="ed-sep" />
            <button className="btn ghost small" onClick={split} title="Split the caption at the playhead (S)">Split</button>
            <button className="btn ghost small" onClick={merge} title="Merge the selected caption with the next (M)">Merge</button>
            <button className="btn ghost small" onClick={add} title="Add a caption at the playhead (A)">Add</button>
            <button className="btn ghost small" onClick={() => remove()} disabled={target() < 0} title="Delete the selected caption (Delete)">Delete</button>
            <span className="ed-sep" />
            <div className="seg" role="group" aria-label="Preview language">
              {((hasEnglish ? ["ta", "en", "both"] : ["ta"]) as View[]).map((v) => (
                <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "ta" ? language.native : v === "en" ? "English" : "Both"}</button>
              ))}
            </div>
          </div>
        </div>

        <aside className="ed-side">
          <div className="seg ed-tabs" role="tablist" aria-label="Inspector">
            {([["caption", "Caption"], ["layers", "Layers"], ["style", "Style"], ["export", "Export"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === "caption" && (sel ? (
            <div className="insp">
              <div className="insp-row">
                <TimeInput key={`s${selected}-${sel.start}`} value={sel.start} label="Start" onChange={(v) => { const prev = cues[selected - 1]; const s = Math.max(prev ? prev.end : 0, Math.min(v, sel.end - 0.2)); editCue(selected, { ...sel, start: s }); }} />
                <TimeInput key={`e${selected}-${sel.end}`} value={sel.end} label="End" onChange={(v) => { const next = cues[selected + 1]; const en = Math.min(next ? next.start : duration, Math.max(v, sel.start + 0.2)); editCue(selected, { ...sel, end: en }); }} />
                <span className="muted small">{(sel.end - sel.start).toFixed(2)} s</span>
              </div>
              <label className="insp-field">{language.name}
                <textarea id="cap-text" lang={short} rows={2} value={sel.ta} onChange={(e) => editCue(selected, setText(sel, "ta", e.target.value))} />
              </label>
              {hasEnglish && <label className="insp-field">English<textarea rows={2} value={sel.en} onChange={(e) => editCue(selected, setText(sel, "en", e.target.value))} /></label>}

              <div className="insp-head">
                <h3>This caption&apos;s look</h3>
                <button className="btn ghost small" onClick={() => styleCue(selected, null)} disabled={!sel.style}>Use project style</button>
              </div>
              <LookControls look={selLook} own={own} set={(patch) => styleCue(selected, patch)} tamil={tamil} project={look} />

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

              <h3>Project style</h3>
              <p className="muted small">{styleOf(styleId).blurb} Applies to every caption without its own look.</p>
              {GROUPS.map((g) => (
                <div key={g} className="style-group">
                  <span className="muted small">{g}</span>
                  <div className="style-grid" role="radiogroup" aria-label={`${g} styles`}>
                    {CAPTION_STYLES.filter((x) => x.group === g).map((x) => (
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
                <button className="btn ghost small" onClick={() => setCustom({})} disabled={!Object.keys(custom).length}>Reset to {styleOf(styleId).name}</button>
              </div>
              <LookControls look={look} own={custom} set={tweak} tamil={tamil} />
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
                {custom.safe === "custom" && (["top", "bottom", "left", "right"] as const).map((k) => (
                  <label key={k}>Keep clear: {k} <span className="cz-val">{Math.round(look.safe[k] * 100)}%</span>
                    <input type="range" min={0} max={0.4} step={0.01} value={look.safe[k]} onChange={(e) => tweak({ safeCustom: { ...look.safe, [k]: +e.target.value } })} />
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
                  <button className="btn" onClick={render} disabled={!job.hasMedia}>{dirty ? "Save and export MP4" : "Export MP4"}</button>
                  {job.renderStatus === "done" && <a className="btn ghost" href={`/api/jobs/${job.id}/render`} download>Download MP4</a>}
                </div>
              )}
              {job.renderStatus === "failed" && <p className="error">{job.renderError}</p>}
              <p className="muted small">Burns in {view === "both" ? `${language.name} + English` : view === "en" ? "English" : language.name} (the language shown under the video), with every caption&apos;s own look. {!job.hasMedia && "The video was removed after 7 days, so it can't be exported."}</p>

              <h3>Subtitle files</h3>
              <div className="export-row">
                <label>Language
                  <select value={lang} onChange={(e) => setLang(e.target.value as View)}>
                    <option value="ta">{language.name}</option>
                    {hasEnglish && <><option value="en">English</option><option value="both">{language.name} + English</option></>}
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
    </div>
  );
}

function ShortcutHelp() {
  const keys: [string, string][] = [["Space", "Play / pause"], ["← →", "One frame (with ⇧: one second)"], ["↑ ↓", "Previous / next caption"], ["S", "Split at the playhead"], ["M", "Merge with the next"], ["A", "Add a caption at the playhead"], ["Delete", "Delete the caption"], ["⌘Z / ⇧⌘Z", "Undo / redo"], ["⌘S", "Save"], ["+ / −", "Zoom the timeline"]];
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
