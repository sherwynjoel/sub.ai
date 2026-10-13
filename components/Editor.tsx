"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { languageOf, shortCode } from "@/lib/languages";
import { CAPTION_FONTS, CAPTION_STYLES, resolveStyle, SAFE_ZONES, styleOf, type CaptionCustom, type SafeZoneId } from "@/lib/captionStyles";
import StyledCaption from "@/components/StyledCaption";
import "@/app/caption-styles.css";

type Cue = { start: number; end: number; ta: string; en: string };
type Job = {
  id: string; filename: string; language: string; status: string; progress: number; error: string | null;
  hasMedia: boolean; provider: string | null; model: string | null; cues: Cue[];
  captionStyle: string; captionCustom: CaptionCustom; renderStatus: string | null; renderProgress: number; renderError: string | null; renderLang: string;
};
type View = "ta" | "en" | "both";
const GROUPS = ["Trending", "Aesthetic", "Clean", "Fun"] as const;

/** The styled caption over the player, redrawn every frame while the video plays so word timing is smooth. */
function LiveCaption({ video, cues, styleId, custom, portrait, view, onMove }: { video: React.RefObject<HTMLVideoElement | null>; cues: Cue[]; styleId: string; custom: CaptionCustom; portrait: boolean; view: View; onMove: (x: number, y: number) => void }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let raf = 0;
    const tick = () => { setT(v.currentTime); if (!v.paused) raf = requestAnimationFrame(tick); };
    const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    v.addEventListener("play", kick);
    v.addEventListener("pause", kick);
    v.addEventListener("seeked", kick);
    v.addEventListener("timeupdate", kick);
    return () => { cancelAnimationFrame(raf); v.removeEventListener("play", kick); v.removeEventListener("pause", kick); v.removeEventListener("seeked", kick); v.removeEventListener("timeupdate", kick); };
  }, [video]);
  const live = cues.find((x) => t >= x.start && t < x.end);
  // Paused between lines: show the first line as a stand-in so the caption can still be dragged and styled.
  const ghost = !live && !!video.current?.paused;
  const c = live ?? (ghost ? cues[0] : undefined);
  if (!c) return null;
  const main = view === "en" ? c.en : c.ta;
  if (!main.trim()) return null;
  const { position, offset, x, y, safe } = resolveStyle(styleId, custom, portrait);
  const free = x !== undefined && y !== undefined;
  // Captions wrap inside the safe zone; a dragged one at most twice its distance to the nearer zone edge.
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
    const at = (ev: PointerEvent) => onMove(
      Math.min(0.95, Math.max(0.05, (ev.clientX - frame.left) / frame.width)),
      Math.min(0.95, Math.max(0.05, (ev.clientY - frame.top) / frame.height)),
    );
    const stop = () => { removeEventListener("pointermove", at); removeEventListener("pointerup", stop); };
    addEventListener("pointermove", at);
    addEventListener("pointerup", stop);
  };
  return (
    <div className={`overlay styled${free ? " free" : ""}${ghost ? " ghost" : ""}`} style={place}>
      <div className="drag-handle" onPointerDown={drag} title="Drag to move the subtitle">
        <StyledCaption styleId={styleId} custom={custom} text={main} sub={view === "both" ? c.en : undefined} start={c.start} end={c.end} time={ghost ? c.end - 0.01 : t} />
      </div>
    </div>
  );
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

export default function Editor({ initial }: { initial: Job }) {
  const router = useRouter();
  const [job, setJob] = useState(initial);
  const [cues, setCues] = useState<Cue[]>(initial.cues);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const hasEnglish = initial.cues.some((c) => c.en); // projects made without an English line
  const [view, setView] = useState<View>(hasEnglish ? "both" : "ta");
  const [now, setNow] = useState(0);
  const [lang, setLang] = useState<View>("ta");
  const [fmt, setFmt] = useState("srt");
  const [styleId, setStyleId] = useState(initial.captionStyle || "minimal");
  const [custom, setCustom] = useState<CaptionCustom>(initial.captionCustom ?? {});
  const [portrait, setPortrait] = useState(false);
  const [ratio, setRatio] = useState(16 / 9); // the video's own shape, so preview positions match the MP4
  const [showZones, setShowZones] = useState(false);
  const language = languageOf(job.language);
  const short = shortCode(job.language);
  const video = useRef<HTMLVideoElement>(null);
  const list = useRef<HTMLOListElement>(null);

  // Poll until processing finishes.
  useEffect(() => {
    if (job.status === "done" || job.status === "failed") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (!res.ok) return;
      const j: Job = await res.json();
      setJob(j);
      if (j.status === "done") setCues(j.cues);
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
  // A new style starts clean; edits are then layered on top of it.
  function pickStyle(id: string) {
    setStyleId(id);
    setCustom({});
    saveLook({ captionStyle: id, captionCustom: {} });
  }
  // Save customisations shortly after the last change.
  const firstLook = useRef(true);
  useEffect(() => {
    if (firstLook.current) { firstLook.current = false; return; }
    const t = setTimeout(() => saveLook({ captionCustom: custom }), 400);
    return () => clearTimeout(t);
  }, [custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const tweak = (patch: CaptionCustom) => setCustom((c) => ({ ...c, ...patch }));
  const look = resolveStyle(styleId, custom, portrait);
  const hex = (c: string | undefined, fallback: string) => (c ?? fallback).slice(0, 7);

  async function render() {
    if (dirty) await save();
    await saveLook({ captionStyle: styleId, captionCustom: custom });
    const res = await fetch(`/api/jobs/${job.id}/render`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ style: styleId, lang: view }) });
    if (res.ok) setJob((j) => ({ ...j, renderStatus: "queued", renderProgress: 0, renderError: null, renderLang: view, captionStyle: styleId }));
    else setMsg((await res.json().catch(() => ({}))).error || "Couldn't start the render.");
  }

  const activeIdx = cues.findIndex((c) => now >= c.start && now < c.end);

  // Keep the playing line in view.
  useEffect(() => {
    if (activeIdx < 0 || video.current?.paused) return;
    list.current?.children[activeIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cues }) });
    setSaving(false);
    if (res.ok) { setDirty(false); setMsg("Saved"); setTimeout(() => setMsg(""), 2000); }
    else setMsg((await res.json().catch(() => ({}))).error || "Couldn't save. Try again.");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (dirty) save(); }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    addEventListener("keydown", onKey);
    addEventListener("beforeunload", onLeave);
    return () => { removeEventListener("keydown", onKey); removeEventListener("beforeunload", onLeave); };
  });

  function edit(i: number, patch: Partial<Cue>) {
    setCues((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
    setDirty(true);
  }
  function insertAfter(i: number) {
    setCues((cs) => {
      const at = cs[i]?.end ?? 0;
      const next = cs[i + 1]?.start ?? at + 2;
      return [...cs.slice(0, i + 1), { start: at, end: Math.max(at + 0.5, Math.min(at + 2, next)), ta: "", en: "" }, ...cs.slice(i + 1)];
    });
    setDirty(true);
  }
  function remove(i: number) {
    setCues((cs) => cs.filter((_, j) => j !== i));
    setDirty(true);
  }
  function seek(t: number) {
    if (video.current) { video.current.currentTime = t + 0.01; video.current.play().catch(() => {}); }
  }
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

  return (
    <div className="editor">
      <div className="editor-top">
        <div>
          <Link href="/app" className="muted">Projects</Link>
          <h1 className="page-title">{job.filename}</h1>
        </div>
        <div className="tools">
          <span className="muted save-msg" aria-live="polite">{msg || (dirty ? "Unsaved changes" : "")}</span>
          <button className="btn" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>

      <div className="editor-grid">
        <div className="viewer">
          {job.hasMedia ? (
            <>
              <div className="canvas-bar" role="toolbar" aria-label="Caption look">
                <select value={look.font} onChange={(e) => tweak({ font: e.target.value })} aria-label="Font">
                  {CAPTION_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <button onClick={() => tweak({ size: Math.max(0.4, +((look.size ?? 1) - 0.1).toFixed(2)) })} aria-label="Smaller text">A−</button>
                <button onClick={() => tweak({ size: Math.min(2.6, +((look.size ?? 1) + 0.1).toFixed(2)) })} aria-label="Larger text">A+</button>
                <label title="Text colour">Text<input type="color" value={hex(look.color, "#ffffff")} onChange={(e) => tweak({ color: e.target.value })} /></label>
                <label title="Highlight colour">Mark<input type="color" value={hex(look.mark ?? look.keyword?.color ?? look.active, "#ffe14d")} onChange={(e) => tweak({ accent: e.target.value })} /></label>
                <label title="Outline"><input type="checkbox" checked={!!look.outline} onChange={(e) => tweak({ outline: e.target.checked ? hex(look.outline?.[0], "#000000") : null })} />Outline{look.outline && <input type="color" value={hex(look.outline[0], "#000000")} onChange={(e) => tweak({ outline: e.target.value })} />}</label>
                <label title="Background"><input type="checkbox" checked={!!look.box} onChange={(e) => tweak({ box: e.target.checked ? hex(look.box, "#0b0b0b") : null })} />Box{look.box && <input type="color" value={hex(look.box, "#0b0b0b")} onChange={(e) => tweak({ box: e.target.value })} />}</label>
                <span className="canvas-hint">Drag the subtitle to move it</span>
              </div>
            <div className="player" style={{ aspectRatio: ratio, width: `min(100%, ${(72 * ratio).toFixed(2)}vh)` }}>
              <video ref={video} src={`/api/jobs/${job.id}/media`} controls preload="metadata" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => { const v = e.currentTarget; setPortrait(v.videoHeight > v.videoWidth); if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight); }} />
              {showZones && (["top", "right", "bottom", "left"] as const).map((k) => <i key={k} className={`zone zone-${k}`} style={{ [k === "top" || k === "bottom" ? "height" : "width"]: `${look.safe[k] * 100}%` }} />)}
              <LiveCaption video={video} cues={cues} styleId={styleId} custom={custom} portrait={portrait} view={view} onMove={(x, y) => tweak({ x, y })} />
            </div>
            </>
          ) : (
            <div className="player gone"><p>The video was removed after 7 days. Your subtitles are still here.</p></div>
          )}
          <div className="seg" role="group" aria-label="Preview language">
            {((hasEnglish ? ["ta", "en", "both"] : ["ta"]) as View[]).map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "ta" ? language.native : v === "en" ? "English" : "Both"}</button>
            ))}
          </div>

          <div className="panel styles-panel">
            <div className="styles-head">
              <h2>Caption style</h2>
              <span className="muted small">{styleOf(styleId).blurb}</span>
            </div>
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
            <div className="customize">
              <div className="cz-head">
                <h3>Customize</h3>
                <button className="btn ghost small" onClick={() => setCustom({})} disabled={!Object.keys(custom).length}>Reset to {styleOf(styleId).name}</button>
              </div>
              <div className="cz-grid">
                <label>Font
                  <select value={look.font} onChange={(e) => tweak({ font: e.target.value })}>
                    {CAPTION_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label>Size <span className="cz-val">{Math.round((look.size ?? 1) * 100)}%</span>
                  <input type="range" min={0.4} max={2.6} step={0.05} value={look.size ?? 1} onChange={(e) => tweak({ size: +e.target.value })} />
                </label>
                <label className="cz-color">Text colour
                  <input type="color" value={hex(look.color, "#ffffff")} onChange={(e) => tweak({ color: e.target.value })} />
                </label>
                <label className="cz-color">Highlight colour
                  <input type="color" value={hex(look.mark ?? look.keyword?.color ?? look.active, "#ffe14d")} onChange={(e) => tweak({ accent: e.target.value })} />
                </label>
                <div className="cz-toggle">
                  <label className="cz-check"><input type="checkbox" checked={!!look.outline} onChange={(e) => tweak({ outline: e.target.checked ? hex(look.outline?.[0], "#000000") : null })} /> Outline</label>
                  {look.outline && <>
                    <input type="color" aria-label="Outline colour" value={hex(look.outline[0], "#000000")} onChange={(e) => tweak({ outline: e.target.value })} />
                    <input type="range" aria-label="Outline thickness" min={0.01} max={0.2} step={0.01} value={look.outline[1]} onChange={(e) => tweak({ outlineWidth: +e.target.value })} />
                  </>}
                </div>
                <div className="cz-toggle">
                  <label className="cz-check"><input type="checkbox" checked={!!look.box} onChange={(e) => tweak({ box: e.target.checked ? hex(look.box, "#0b0b0b") : null })} /> Background</label>
                  {look.box && <input type="color" aria-label="Background colour" value={hex(look.box, "#0b0b0b")} onChange={(e) => tweak({ box: e.target.value })} />}
                  <label className="cz-check"><input type="checkbox" checked={!!look.shadow} onChange={(e) => tweak({ shadow: e.target.checked })} /> Shadow</label>
                </div>
                <div className="cz-field">
                  <span>Letter case</span>
                  <div className="seg" role="group" aria-label="Letter case">
                    {([["none", "As typed"], ["upper", "CAPS"], ["lower", "lower"]] as const).map(([v, l]) => (
                      <button key={v} aria-pressed={(look.caps ? "upper" : look.lower ? "lower" : "none") === v} onClick={() => tweak({ case: v })}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="cz-field">
                  <span>Position</span>
                  <div className="seg" role="group" aria-label="Position">
                    {(["top", "middle", "bottom"] as const).map((v) => (
                      <button key={v} aria-pressed={look.position === v} onClick={() => tweak({ position: v, x: undefined, y: undefined })}>{v[0].toUpperCase() + v.slice(1)}</button>
                    ))}
                  </div>
                </div>
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

            <div className="render-row">
              {rendering ? (
                <div className="render-progress">
                  <span className="bar"><i style={{ width: `${Math.max(3, job.renderProgress)}%` }} /></span>
                  <span className="muted small">{job.renderStatus === "queued" ? "Waiting to render…" : `Rendering ${styleOf(job.captionStyle).name} · ${job.renderProgress}%`}</span>
                </div>
              ) : (
                <>
                  <button className="btn" onClick={render} disabled={!job.hasMedia}>Render styled MP4</button>
                  {job.renderStatus === "done" && <a className="btn ghost" href={`/api/jobs/${job.id}/render`} download>Download {styleOf(job.captionStyle).name} MP4</a>}
                </>
              )}
              {job.renderStatus === "failed" && <p className="error">{job.renderError}</p>}
              <p className="muted small">Burns in {view === "both" ? `${language.name} + English` : view === "en" ? "English" : language.name} (switch above the panel). {!job.hasMedia && "The video was removed after 7 days, so it can't be rendered."}</p>
            </div>
          </div>

          <div className="panel export">
            <h2>Download</h2>
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
            {dirty ? (
              <button className="btn" onClick={save}>Save changes to download</button>
            ) : (
              <a className="btn" href={`/api/jobs/${job.id}/export?lang=${lang}&fmt=${fmt}`} download>Download {fmt.toUpperCase()}</a>
            )}
            <p className="muted small">{cues.length} subtitles · made with {job.provider} / {job.model}</p>
            <button className="btn danger small" onClick={del}>Delete project</button>
          </div>
        </div>

        <ol className="cues" ref={list}>
          {cues.map((c, i) => (
            <li key={i} className={i === activeIdx ? "on" : undefined}>
              <div className="times">
                <button className="seek" onClick={() => seek(c.start)} title="Play from here" aria-label={`Play from ${tc(c.start)}`}>
                  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M1 1l8 5-8 5z" fill="currentColor" /></svg>
                </button>
                <TimeInput key={`s${c.start}`} value={c.start} onChange={(start) => edit(i, { start })} label="Start" />
                <TimeInput key={`e${c.end}`} value={c.end} onChange={(end) => edit(i, { end })} label="End" />
                <span className="row-tools">
                  <button onClick={() => insertAfter(i)} title="Add a subtitle after this one">Add</button>
                  <button onClick={() => remove(i)} title="Remove this subtitle">Remove</button>
                </span>
              </div>
              <textarea lang={short} rows={1} value={c.ta} onChange={(e) => edit(i, { ta: e.target.value })} aria-label={`${language.name} subtitle ${i + 1}`} />
              <textarea rows={1} value={c.en} onChange={(e) => edit(i, { en: e.target.value })} aria-label={`English subtitle ${i + 1}`} />
            </li>
          ))}
          {cues.length === 0 && (
            <li className="empty-cues">
              <p className="muted">No speech was found in this video.</p>
              <button className="btn ghost small" onClick={() => insertAfter(-1)}>Add a subtitle by hand</button>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

function TimeInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(tc(value)); // parent remounts via key when value changes
  return (
    <input
      className="time"
      value={text}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { const v = parseTc(text); if (v === null) setText(tc(value)); else onChange(v); }}
    />
  );
}
