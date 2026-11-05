"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES, languageOf } from "@/lib/languages";
import { CAPTION_TYPES, typeLabel, typeSettings, type CaptionType } from "@/lib/captionTypes";
import CaptionTypePicker from "@/components/CaptionTypePicker";
import TetrisLoader from "@/components/TetrisLoader";
import GlassFolder, { type FolderFile } from "@/components/GlassFolder";
import { DEFAULT_STYLE, SAFE_ZONES, styleOf } from "@/lib/captionStyles";
import FlowSteps from "@/components/FlowSteps";
import StylePicker from "@/components/StylePicker";
import StyledCaption from "@/components/StyledCaption";
import { extractAudio, type AudioTrack } from "@/lib/audioTrack";
import { localVideo, progressOf, sendingVideos, sendVideo, subscribeUploads, uploadsVersion } from "@/lib/videoUpload";

type Job = {
  id: string; filename: string; durationSec: number; status: string; progress: number;
  error: string | null; createdAt: string; cueCount: number; language: string; script: string; captionCustom?: { show?: "ta" | "en" | "both" };
  hasMedia: boolean; hasPreview?: boolean; renderStatus?: string | null; videoTotal?: number | null;
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
          ...(job.renderStatus === "done" || job.renderStatus === "stale" ? [{ name: "Styled video.mp4", meta: job.renderStatus === "stale" ? "Made before your latest changes" : "With captions", href: `/api/jobs/${job.id}/render`, art: "ember" as const }] : []),
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
          video={local?.url ?? (job.hasMedia ? `/api/jobs/${job.id}/media${job.hasPreview ? "?preview=1" : ""}` : undefined)}
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
  // The new-project steps after a video is picked: 1 captions (language, type), 2 style; then it's sent.
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<string>(DEFAULT_STYLE);
  const [preview, setPreview] = useState<string>();
  const [demoT, setDemoT] = useState(0);
  const still = useRef<HTMLVideoElement>(null);
  useEffect(() => { fetch("/api/presets").then((r) => (r.ok ? r.json() : null)).then((d) => { const p = d?.find?.((x: { isDefault?: boolean }) => x.isDefault); if (p?.styleId) setStyle(p.styleId); }).catch(() => {}); }, []);
  useEffect(() => { // the chosen style's animation, playing over the video in the style step
    if (step !== 2) return;
    const t0 = performance.now(), id = window.setInterval(() => setDemoT(((performance.now() - t0) / 1000) % 3.6), 60);
    return () => clearInterval(id);
  }, [step]);
  /** A still of the picked video, behind the style previews. */
  const frame = () => {
    const v = still.current;
    if (!v?.videoWidth) return undefined;
    try {
      const c = document.createElement("canvas"), k = 360 / Math.max(v.videoWidth, v.videoHeight);
      c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.7);
    } catch { return undefined; }
  };
  const cancel = () => { setCheck(null); setStep(0); if (preview) URL.revokeObjectURL(preview); setPreview(undefined); };
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
    // then the user says how the captions read and look, before anything is sent
    setPreview(file.type.startsWith("video/") || /\.(mp4|m4v|mov|webm|mkv)$/i.test(file.name) ? URL.createObjectURL(file) : undefined);
    setCheck({ file, audio, seconds: seconds || 0, left: me && typeof me.secondsLeft === "number" ? me.secondsLeft : Infinity });
    setStep(1);
  }

  async function send(file: File, audio: AudioTrack | null) {
    setError("");
    setCheck(null);
    const { script, show, english } = typeSettings(ctype.type, ctype.withEnglish);
    const base = `/api/upload?name=${encodeURIComponent(file.name)}&lang=${language}&script=${script}&english=${english ? 1 : 0}&show=${show}&safe=${safe}&style=${encodeURIComponent(style)}`;
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
      setStep(0);
      router.push(`/app/jobs/${data.id}`); // on to the project: its subtitles being made, then the editor
    };
    xhr.onerror = () => { setUpload(null); setError("Upload failed. Check your connection and try again."); };
    xhr.send(body);
  }

  return (
    <>
      <section className={`composer${check ? " wizard" : ""}`} aria-label="New project">
        <FlowSteps at={upload ? 3 : check ? step : 0} onStep={check && !upload ? (i) => (i === 0 ? cancel() : setStep(i)) : undefined} />
        {upload ? (
          <div className="drop uploading">
            <div className="drop-inner uploading-inner">
              <TetrisLoader columns={8} rows={14} cellSize={7} gap={2} label={`Uploading ${upload.name}`} />
              <strong>Uploading {upload.name}</strong>
              <div className="bar" role="progressbar" aria-valuenow={upload.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${upload.pct}%` }} /></div>
              <span className="muted">{upload.note ? `${upload.note} ` : ""}{upload.pct}%{upload.pct >= 100 ? ". Starting your subtitles…" : ". Keep this tab open until it finishes."}</span>
            </div>
          </div>
        ) : !check ? (
          <div className={`drop${drag ? " over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}>
            <div className="drop-inner">
              <strong>Start a new project</strong>
              <span className="muted">Drop a video here, or choose one. MP4, MOV, MKV, MP3 or WAV, up to 4 GB.</span>
              <button className="btn big" onClick={() => input.current?.click()}>Choose a video</button>
              <span className="muted small">Next you&apos;ll pick the language, the caption type and a style.</span>
            </div>
          </div>
        ) : (
          <div className="wiz">
            {/* the picked video, with what it uses; the chosen style playing over it in the style step */}
            <div className="wiz-video">
              <div className="wiz-frame">
                {preview ? <video ref={still} src={preview} muted playsInline preload="auto" onLoadedData={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = Math.min(1, check.seconds / 3); }} /> : <div className="wiz-audio">🎵</div>}
                {step === 2 && <div className="wiz-cap"><StyledCaption styleId={style} text={(language === "ta-IN" && CAPTION_TYPES.find((t) => t.id === ctype.type)?.sample) || "This is how your captions will look"} start={0.2} end={2.9} time={Math.min(demoT, 2.89)} /></div>}
              </div>
              <div className="wiz-meta">
                <strong title={check.file.name}>{check.file.name}</strong>
                {check.seconds > 0 && <span className="muted small">{mins(check.seconds)} long · uses {minsUsed(check.seconds)} min{Number.isFinite(check.left) ? ` of your ${minsUsed(check.left)} min left` : ""}</span>}
                <button className="btn ghost small" onClick={cancel}>Choose another video</button>
              </div>
            </div>
            <div className="wiz-body">
              {Number.isFinite(check.left) && Math.ceil(check.seconds) > check.left ? (
                <div className="wiz-short">
                  <h2>Not enough minutes</h2>
                  <p>This video needs <b>{minsUsed(check.seconds)} min</b>; you have <b>{minsUsed(check.left)} min</b> left.</p>
                  <div className="wiz-actions"><Link className="btn" href="/app/billing">See plans</Link><button className="btn ghost" onClick={cancel}>Choose another</button></div>
                </div>
              ) : step === 1 ? (
                <>
                  <h2>What should the captions say?</h2>
                  <label className="wiz-field">Language spoken in the video
                    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}
                    </select>
                  </label>
                  <CaptionTypePicker compact language={languageOf(language).name} tamil={language === "ta-IN"} type={ctype.type} withEnglish={ctype.withEnglish}
                    onChange={(type, withEnglish) => setCtype({ type, withEnglish })} />
                  <details className="wiz-more">
                    <summary>More options</summary>
                    <label className="wiz-field">Keep captions clear of the app&apos;s buttons (safe zone)
                      <select value={safe} onChange={(e) => setSafe(e.target.value)}>
                        {Object.entries(SAFE_ZONES).filter(([id]) => id !== "custom").map(([id, z]) => <option key={id} value={id}>{id === "none" ? "None (full frame)" : z.name}</option>)}
                      </select>
                    </label>
                  </details>
                  <div className="wiz-actions">
                    <button className="btn ghost" onClick={cancel}>Back</button>
                    <button className="btn big" onClick={() => setStep(2)}>Next: choose a style</button>
                  </div>
                </>
              ) : (
                <>
                  <h2>Choose a style <span className="muted small">· {styleOf(style).name}</span></h2>
                  <p className="muted small">Tap one to see it on your video. You can change it, and every colour, font and size, in the editor later.</p>
                  <div className="wiz-styles"><StylePicker styleId={style} onPick={setStyle} frame={frame} /></div>
                  <div className="wiz-actions sticky">
                    <button className="btn ghost" onClick={() => setStep(1)}>Back</button>
                    <button className="btn big" onClick={() => send(check.file, check.audio)}>Generate subtitles</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <input ref={input} type="file" accept="video/*,audio/*,.mkv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
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
