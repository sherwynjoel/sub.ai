"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Cue = { start: number; end: number; ta: string; en: string };
type Job = {
  id: string; filename: string; status: string; progress: number; error: string | null;
  hasMedia: boolean; provider: string | null; model: string | null; cues: Cue[];
};
type View = "ta" | "en" | "both";

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
  const [view, setView] = useState<View>("both");
  const [now, setNow] = useState(0);
  const [lang, setLang] = useState<View>("ta");
  const [fmt, setFmt] = useState("srt");
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

  const activeIdx = cues.findIndex((c) => now >= c.start && now < c.end);
  const active = cues[activeIdx];

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
            <div className="player">
              <video ref={video} src={`/api/jobs/${job.id}/media`} controls preload="metadata" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} />
              {active && (
                <div className="subtitle overlay">
                  {view !== "en" && <div lang="ta">{active.ta}</div>}
                  {view !== "ta" && <div className="en">{active.en}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="player gone"><p>The video was removed after 7 days. Your subtitles are still here.</p></div>
          )}
          <div className="seg" role="group" aria-label="Preview language">
            {(["ta", "en", "both"] as View[]).map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "ta" ? "தமிழ்" : v === "en" ? "English" : "Both"}</button>
            ))}
          </div>

          <div className="panel export">
            <h2>Download</h2>
            <div className="export-row">
              <label>Language
                <select value={lang} onChange={(e) => setLang(e.target.value as View)}>
                  <option value="ta">Tamil</option><option value="en">English</option><option value="both">Tamil + English</option>
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
              <textarea lang="ta" rows={1} value={c.ta} onChange={(e) => edit(i, { ta: e.target.value })} aria-label={`Tamil subtitle ${i + 1}`} />
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
