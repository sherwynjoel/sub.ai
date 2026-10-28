"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES, languageOf } from "@/lib/languages";
import { typeLabel, typeSettings, type CaptionType } from "@/lib/captionTypes";
import CaptionTypePicker from "@/components/CaptionTypePicker";
import TetrisLoader from "@/components/TetrisLoader";
import GlassFolder, { type FolderFile } from "@/components/GlassFolder";
import { SAFE_ZONES } from "@/lib/captionStyles";
import { extractAudio, type AudioTrack } from "@/lib/audioTrack";
import { localVideo, progressOf, sendingVideos, sendVideo, subscribeUploads, uploadsVersion } from "@/lib/videoUpload";

type Job = {
  id: string; filename: string; durationSec: number; status: string; progress: number;
  error: string | null; createdAt: string; cueCount: number; language: string; script: string; captionCustom?: { show?: "ta" | "en" | "both" };
  hasMedia: boolean; renderStatus?: string | null; videoTotal?: number | null;
};

const mins = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
/** Minutes as charged (whole seconds), one decimal: 312 s → "5.2". */
const minsUsed = (s: number) => (Math.ceil(s) / 60).toFixed(1);

/** A video's length from the browser itself (formats the phone can play), or null. */
function lengthOf(file: File) {
  return new Promise<number | null>((resolve) => {
    const v = document.createElement("video"), url = URL.createObjectURL(file);
    const done = (d: number | null) => { URL.revokeObjectURL(url); resolve(d); };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 6000);
    v.src = url;
  });
}

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
  useSyncExternalStore(subscribeUploads, uploadsVersion, () => 0);
  const local = width > 0 ? localVideo(job.id) : undefined; // width > 0: only in the browser
  const coming = !!job.videoTotal && local?.state !== "done";
  const meta = busy ? (job.status === "queued" ? "Waiting in line" : `Making subtitles ${job.progress}%`)
    : job.status === "failed" ? "Failed"
    : coming ? (local?.state === "sending" ? `Video uploading ${progressOf(local)}%` : "Video upload paused")
    : `${type} · ${mins(job.durationSec)}`;
  const arts = ["dusk", "glacier", "verdant", "aurora", "ember"] as const;
  return (
    <div ref={box} className="folder-cell" title={job.filename}>
      {width > 0 && (
        <GlassFolder
          key={`${job.id}:${job.status}:${job.renderStatus}`} // a new state brings a new set of files
          label={job.filename} meta={meta} width={width}
          video={local?.url ?? (job.hasMedia ? `/api/jobs/${job.id}/media` : undefined)}
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
  const [upload, setUpload] = useState<{ name: string; pct: number; note?: string } | null>(null);
  // A picked video, its length and the minutes left: shown before anything is sent.
  const [check, setCheck] = useState<{ file: File; audio: AudioTrack | null; seconds: number; left: number } | null>(null);
  useSyncExternalStore(subscribeUploads, uploadsVersion, () => 0);
  const inBrowser = useSyncExternalStore(subscribeUploads, () => true, () => false);
  const sending = inBrowser ? sendingVideos() : [];
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
  // When a video finishes arriving, the project list learns it has its video.
  const doneCount = useRef(0);
  useEffect(() => subscribeUploads(() => {
    const n = [...(jobs ?? [])].filter((j) => localVideo(j.id)?.state === "done").length;
    if (n > doneCount.current) { doneCount.current = n; load(); }
  }));
  const busy = jobs?.some((j) => j.status === "queued" || j.status === "processing");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [busy, load]);

  const q = query.trim().toLowerCase();
  const shown = (jobs ?? []).filter((j) => !q || j.filename.toLowerCase().includes(q));

  /**
   * Phones' MP4 / MOV: the sound goes first (about 1 MB a minute, pulled out without re-encoding) so the captions
   * start right away; the video, untouched, follows in pieces in the background (lib/videoUpload.ts) while the
   * editor plays the phone's own copy. Anything else is sent whole, as before.
   */
  /** A file picked: read its length and the minutes left, and show what it will use before sending anything. */
  async function pick(file: File) {
    setError("");
    setCheck(null);
    setUpload({ name: file.name, pct: 0, note: "Checking the video…" });
    const audio = /\.(mp4|m4v|mov)$/i.test(file.name) || /^video\/(mp4|quicktime|x-m4v)$/.test(file.type) ? await extractAudio(file) : null;
    const [seconds, me] = await Promise.all([
      audio?.seconds || lengthOf(file),
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setUpload(null);
    if (seconds && me && typeof me.secondsLeft === "number") setCheck({ file, audio, seconds, left: me.secondsLeft });
    else send(file, audio); // length unknown here: the server checks it as before
  }

  async function send(file: File, audio: AudioTrack | null) {
    setError("");
    setCheck(null);
    const { script, show, english } = typeSettings(ctype.type, ctype.withEnglish);
    const base = `/api/upload?name=${encodeURIComponent(file.name)}&lang=${language}&script=${script}&english=${english ? 1 : 0}&show=${show}&safe=${safe}`;
    const body: Blob = audio ? audio.adts : file;
    const url = audio ? `${base}&audio=1&videoBytes=${file.size}&videoType=${encodeURIComponent(file.type || "video/mp4")}&shift=${audio.shift.toFixed(4)}` : base;
    setUpload({ name: file.name, pct: 0, note: audio ? "Sending the sound first…" : undefined });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("content-type", audio ? "audio/aac" : file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && setUpload((u) => u && { ...u, pct: Math.round((e.loaded / e.total) * 100) });
    xhr.onload = () => {
      setUpload(null);
      const data = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 300) return setError(data.error || "Upload failed.");
      if (audio) sendVideo(data.id, file); // the video follows; captions are already being made
      load();
      router.refresh(); // update minutes left in the header
    };
    xhr.onerror = () => { setUpload(null); setError("Upload failed. Check your connection and try again."); };
    xhr.send(body);
  }

  return (
    <>
      <section className="composer" aria-label="New project">
        <div
          className={`drop${drag ? " over" : ""}${upload ? " uploading" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f && !upload) pick(f); }}
        >
          {upload ? (
            <div className="drop-inner uploading-inner">
              <TetrisLoader columns={8} rows={14} cellSize={7} gap={2} label={`Uploading ${upload.name}`} />
              <strong>Uploading {upload.name}</strong>
              <div className="bar" role="progressbar" aria-valuenow={upload.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${upload.pct}%` }} /></div>
              <span className="muted">{upload.note ? `${upload.note} ` : ""}{upload.pct}%{upload.pct >= 100 ? ". Starting your subtitles…" : ". Keep this tab open until it finishes."}</span>
            </div>
          ) : check ? (
            // What this video will use, before anything is sent.
            <div className="drop-inner cost-check" role="dialog" aria-label="Minutes this video uses">
              <strong className="cc-name" title={check.file.name}>{check.file.name}</strong>
              <span className="cc-len">{mins(check.seconds)} long</span>
              {Math.ceil(check.seconds) <= check.left ? (
                <>
                  <span>Uses <b>{minsUsed(check.seconds)} min</b> of your <b>{minsUsed(check.left)} min</b> left.</span>
                  <div className="cc-actions">
                    <button className="btn" onClick={() => send(check.file, check.audio)}>Upload</button>
                    <button className="btn ghost" onClick={() => setCheck(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="cc-short">This video needs <b>{minsUsed(check.seconds)} min</b>; you have <b>{minsUsed(check.left)} min</b> left.</span>
                  <div className="cc-actions">
                    <Link className="btn" href="/app/billing">See plans</Link>
                    <button className="btn ghost" onClick={() => setCheck(null)}>Choose another</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="drop-inner">
              <strong>Drop a video here</strong>
              <span className="muted">MP4, MOV, MKV, MP3 or WAV, up to 4 GB</span>
              <button className="btn" onClick={() => input.current?.click()}>Choose a file</button>
            </div>
          )}
          <input ref={input} type="file" accept="video/*,audio/*,.mkv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
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
      {sending.map((u) => (
        <div key={u.jobId} className="video-sending" role="status">
          <span className="bar"><i style={{ width: `${progressOf(u)}%` }} /></span>
          <span><strong>Sending the video · {progressOf(u)}%</strong> <span className="muted">Captions are already being made. You can open <Link href={`/app/jobs/${u.jobId}`}>{u.name}</Link> and edit now; keep this tab open until the video is sent.</span></span>
        </div>
      ))}

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
