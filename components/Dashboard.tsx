"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES, languageOf } from "@/lib/languages";
import { typeLabel, typeSettings, type CaptionType } from "@/lib/captionTypes";
import CaptionTypePicker from "@/components/CaptionTypePicker";
import TetrisLoader from "@/components/TetrisLoader";
import GlassFolder, { type FolderFile } from "@/components/GlassFolder";
import { SAFE_ZONES } from "@/lib/captionStyles";

type Job = {
  id: string; filename: string; durationSec: number; status: string; progress: number;
  error: string | null; createdAt: string; cueCount: number; language: string; script: string; captionCustom?: { show?: "ta" | "en" | "both" };
  hasMedia: boolean; renderStatus?: string | null;
};

const mins = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** A folder as wide as its grid cell (it draws at a fixed width, so it's measured), at most 340 px. */
function ProjectFolder({ job, index }: { job: Job; index: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.min(340, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lang = job.captionCustom?.show === "en" ? "en" : job.captionCustom?.show === "ta" ? "ta" : "both";
  const busy = job.status === "queued" || job.status === "processing";
  const open = `/app/jobs/${job.id}`;
  // The files inside, back to front: the newest (front) is the editor.
  const files: FolderFile[] = busy
    ? [{ name: "View progress", meta: job.status === "queued" ? "In line" : `${job.progress}%`, href: open }]
    : job.status === "failed"
      ? [{ name: "See what went wrong", meta: "Failed", href: open }]
      : [
          { name: "Transcript.txt", meta: "Plain text", href: `/api/jobs/${job.id}/export?lang=${lang}&fmt=txt` },
          { name: "Subtitles.vtt", meta: "Web players", href: `/api/jobs/${job.id}/export?lang=${lang}&fmt=vtt` },
          { name: "Subtitles.srt", meta: "Premiere · YouTube", href: `/api/jobs/${job.id}/export?lang=${lang}&fmt=srt` },
          ...(job.renderStatus === "done" ? [{ name: "Styled video.mp4", meta: "With captions", href: `/api/jobs/${job.id}/render`, art: "ember" as const }] : []),
          { name: "Edit captions", meta: `${job.cueCount} subtitles`, href: open, art: "aurora" as const },
        ];
  const type = typeLabel({ script: job.script, captionCustom: job.captionCustom }, languageOf(job.language).name);
  const meta = busy ? (job.status === "queued" ? "Waiting in line" : `Making subtitles ${job.progress}%`)
    : job.status === "failed" ? "Failed" : `${type} · ${mins(job.durationSec)}`;
  const arts = ["dusk", "glacier", "verdant", "aurora", "ember"] as const;
  return (
    <div ref={box} className="folder-cell" title={job.filename}>
      {width > 0 && (
        <GlassFolder
          key={`${job.id}:${job.status}:${job.renderStatus}`} // a new state brings a new set of files
          label={job.filename} meta={meta} width={width}
          video={job.hasMedia ? `/api/jobs/${job.id}/media` : undefined}
          art={arts[(job.id.charCodeAt(0) + job.id.charCodeAt(1)) % arts.length]} seed={job.id.charCodeAt(2)}
          files={files} action="none" appearDelay={Math.min(index, 8) * 70}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [upload, setUpload] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [ctype, setCtype] = useState<{ type: CaptionType; withEnglish: boolean }>({ type: "spoken", withEnglish: true });
  const [safe, setSafe] = useState("none");
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/jobs").then((r) => (r.ok ? r.json() : null)).then((d) => d && setJobs(d));
  }, []);

  useEffect(load, [load]);
  const busy = jobs?.some((j) => j.status === "queued" || j.status === "processing");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [busy, load]);

  const q = query.trim().toLowerCase();
  const shown = (jobs ?? []).filter((j) => !q || j.filename.toLowerCase().includes(q));

  function send(file: File) {
    setError("");
    setUpload({ name: file.name, pct: 0 });
    const xhr = new XMLHttpRequest();
    const { script, show, english } = typeSettings(ctype.type, ctype.withEnglish);
    xhr.open("POST", `/api/upload?name=${encodeURIComponent(file.name)}&lang=${language}&script=${script}&english=${english ? 1 : 0}&show=${show}&safe=${safe}`);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && setUpload({ name: file.name, pct: Math.round((e.loaded / e.total) * 100) });
    xhr.onload = () => {
      setUpload(null);
      const data = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 300) return setError(data.error || "Upload failed.");
      load();
      router.refresh(); // update minutes left in the header
    };
    xhr.onerror = () => { setUpload(null); setError("Upload failed. Check your connection and try again."); };
    xhr.send(file);
  }

  return (
    <>
      <section className="composer" aria-label="New project">
        <div
          className={`drop${drag ? " over" : ""}${upload ? " uploading" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f && !upload) send(f); }}
        >
          {upload ? (
            <div className="drop-inner uploading-inner">
              <TetrisLoader columns={8} rows={14} cellSize={7} gap={2} label={`Uploading ${upload.name}`} />
              <strong>Uploading {upload.name}</strong>
              <div className="bar" role="progressbar" aria-valuenow={upload.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${upload.pct}%` }} /></div>
              <span className="muted">{upload.pct}%{upload.pct >= 100 ? ". Starting your subtitles…" : ". Keep this tab open until it finishes."}</span>
            </div>
          ) : (
            <div className="drop-inner">
              <strong>Drop a video here</strong>
              <span className="muted">MP4, MOV, MKV, MP3 or WAV, up to 4 GB</span>
              <button className="btn" onClick={() => input.current?.click()}>Choose a file</button>
            </div>
          )}
          <input ref={input} type="file" accept="video/*,audio/*,.mkv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); e.target.value = ""; }} />
        </div>
        <aside className="composer-side">
          <h2>New project</h2>
          <label>Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!!upload}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}
            </select>
          </label>
          <CaptionTypePicker compact language={languageOf(language).name} tamil={language === "ta-IN"} type={ctype.type} withEnglish={ctype.withEnglish}
            onChange={(type, withEnglish) => setCtype({ type, withEnglish })} disabled={!!upload} />
          <label>Safe zone
            <select value={safe} onChange={(e) => setSafe(e.target.value)} disabled={!!upload}>
              {Object.entries(SAFE_ZONES).filter(([id]) => id !== "custom").map(([id, z]) => <option key={id} value={id}>{id === "none" ? "None (full frame)" : z.name}</option>)}
            </select>
          </label>
        </aside>
      </section>
      {error && <p className="error" role="alert">{error} {error.includes("Upgrade") && <Link href="/app/billing">See plans</Link>}</p>}

      <section className="projects" aria-live="polite">
        <div className="projects-head">
          <h2>Your projects {jobs && jobs.length > 0 && <small>{jobs.length}</small>}</h2>
          {jobs && jobs.length > 3 && <input type="search" className="projects-search" placeholder="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search projects" />}
        </div>
        {jobs === null ? (
          <p className="muted">Loading your projects…</p>
        ) : jobs.length === 0 ? (
          <p className="muted empty">Your projects will appear here. Upload your first video to get subtitles in your language and English.</p>
        ) : shown.length === 0 ? (
          <p className="muted empty">No project matches “{query}”.</p>
        ) : (
          <div className="folder-grid">
            {shown.map((j, i) => <ProjectFolder key={j.id} job={j} index={i} />)}
          </div>
        )}
      </section>
    </>
  );
}
