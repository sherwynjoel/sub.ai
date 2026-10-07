"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Job = {
  id: string; filename: string; durationSec: number; status: string; progress: number;
  error: string | null; createdAt: string; cueCount: number;
};

const mins = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const STATUS: Record<string, string> = { queued: "Waiting in line", processing: "Transcribing", done: "Ready", failed: "Failed" };

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [upload, setUpload] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
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

  function send(file: File) {
    setError("");
    setUpload({ name: file.name, pct: 0 });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload?name=${encodeURIComponent(file.name)}`);
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
      <div
        className={`drop${drag ? " over" : ""}${upload ? " uploading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f && !upload) send(f); }}
      >
        {upload ? (
          <div className="drop-inner">
            <strong>Uploading {upload.name}</strong>
            <div className="bar" role="progressbar" aria-valuenow={upload.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${upload.pct}%` }} /></div>
            <span className="muted">{upload.pct}%</span>
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
      {error && <p className="error" role="alert">{error} {error.includes("Upgrade") && <Link href="/app/billing">See plans</Link>}</p>}

      <section className="jobs" aria-live="polite">
        {jobs === null ? (
          <p className="muted">Loading your projects…</p>
        ) : jobs.length === 0 ? (
          <p className="muted empty">Your projects will appear here. Upload your first video to get Tamil and English subtitles.</p>
        ) : (
          jobs.map((j) => (
            <Link key={j.id} href={`/app/jobs/${j.id}`} className={`job ${j.status}`}>
              <span className="name">{j.filename}</span>
              <span className="meta muted">{mins(j.durationSec)} · {new Date(j.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              <span className="state">
                {j.status === "processing" || j.status === "queued" ? (
                  <>
                    <span className="bar"><i style={{ width: `${j.progress}%` }} /></span>
                    <span>{STATUS[j.status]}{j.status === "processing" ? ` ${j.progress}%` : ""}</span>
                  </>
                ) : (
                  <span>{j.status === "done" ? `${j.cueCount} subtitles` : STATUS[j.status]}</span>
                )}
              </span>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
