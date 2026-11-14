"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StyledCaption from "@/components/StyledCaption";
import { STYLE_CHOICES, POPULAR } from "@/lib/captionStyles";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import { savePending } from "@/lib/pendingVideo";
import "@/app/caption-styles.css";

const MAX = 4 * 1024 ** 3;
const SAMPLE: Record<string, string> = {
  "ta-IN": "இந்த video-க்கு subtitles ready!",
  "hi-IN": "इस video के subtitles तैयार हैं!",
};
const LINE = { start: 0.3, end: 2.7, loop: 3.6 };
const okFile = (f: File) => f.type.startsWith("video/") || f.type.startsWith("audio/") || /\.(mp4|m4v|mov|mkv|webm|mp3|wav|m4a)$/i.test(f.name);

/**
 * The home page's own upload: drop a video, watch it play here with captions in a style you tap, then sign up in
 * the same box. The video stays in the browser (lib/pendingVideo) and opens in the app after sign-in.
 */
export default function HomeUpload({ popular }: { popular: string[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>();
  const [ratio, setRatio] = useState(16 / 9);
  const [drag, setDrag] = useState(false);
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const ids = [...new Set([...popular, ...POPULAR])].filter((id) => STYLE_CHOICES.some((s) => s.id === id)).slice(0, 6);
  const [style, setStyle] = useState(ids[0] ?? "tall-caps");
  const [t, setT] = useState(LINE.end - 0.01);
  const [stage, setStage] = useState<"pick" | "account">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLElement>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { // the caption's animation, on a loop while a video is showing
    if (!file || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now(), id = window.setInterval(() => setT(((performance.now() - t0) / 1000) % LINE.loop), 60);
    return () => clearInterval(id);
  }, [file]);

  function pick(f: File | undefined) {
    if (!f) return;
    setError("");
    if (!okFile(f)) return setError("That isn't a video or sound file. Try an MP4, MOV, MKV, MP3 or WAV.");
    if (f.size > MAX) return setError("That file is over 4 GB. Try a shorter or smaller export.");
    setFile(f); setStage("pick");
    setUrl(f.type.startsWith("audio/") || /\.(mp3|wav|m4a)$/i.test(f.name) ? undefined : URL.createObjectURL(f));
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Keep the video for the app, then on to it: straight away when signed in, after the account box otherwise. */
  async function go() {
    if (!file) return;
    setBusy(true); setError("");
    try { // the app reads these to fill in the new project's choices
      const last = JSON.parse(localStorage.getItem("vs-last-project") || "{}");
      localStorage.setItem("vs-last-project", JSON.stringify({ ...last, language, style }));
    } catch { /* private mode */ }
    const kept = await savePending({ file, language, style });
    const me = await fetch("/api/me").then((r) => r.ok).catch(() => false);
    setBusy(false);
    if (me) { location.href = "/app"; return; }
    if (!kept) setError("This browser can't hold the video while you sign up (private mode?). After signing up, choose it again in the app.");
    setStage("account");
  }

  async function signup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setError(data.error || "Something went wrong. Try again."); }
    location.href = "/app"; // a full load: the app needs its own page setup to work on the video
  }

  const lang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  const text = SAMPLE[language] ?? "Your subtitles will look like this";
  return (
    <section ref={box} className="wrap hu" id="upload" aria-labelledby="hu-h">
      <div className="hu-head">
        <span className="hu-kicker">Try it now</span>
        <h2 id="hu-h">Drop your video. <span className="mark">See it with subtitles.</span></h2>
        <p className="sec-lede">Your video plays right here with captions on it, before you sign up. Nothing is uploaded until you say go.</p>
      </div>

      {!file ? (
        <div className={`hu-drop${drag ? " over" : ""}`} role="button" tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
          <span className="hu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
          </span>
          <strong>Drop a video here</strong>
          <span className="muted">or <u>choose one</u> from your device · MP4, MOV, MKV, MP3, WAV · up to 4 GB</span>
          <span className="hu-trust"><span>Plans from ₹499</span><span>{LANGUAGES.length} Indian languages + English</span></span>
        </div>
      ) : (
        <div className="hu-try">
          <div className="hu-stage" style={{ aspectRatio: ratio }}>
            {url ? <video src={url} autoPlay muted loop playsInline onLoadedMetadata={(e) => { const v = e.currentTarget; if (v.videoWidth) setRatio(Math.max(9 / 16, Math.min(16 / 9, v.videoWidth / v.videoHeight))); }} />
              : <div className="hu-audio" aria-hidden="true">♪</div>}
            <div className="hu-cap" aria-hidden="true">
              <StyledCaption styleId={style} text={text} start={LINE.start} end={LINE.end} time={Math.min(t, LINE.end - 0.01)} />
            </div>
            <span className="hu-badge">Preview · on your device</span>
          </div>

          <div className="hu-side">
            {stage === "pick" ? (
              <>
                <p className="hu-file" title={file.name}><b>{file.name}</b><button className="link" onClick={() => { setFile(null); setUrl(undefined); }}>Change</button></p>
                <label className="hu-field">Language spoken in the video
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}
                  </select>
                </label>
                <span className="hu-label">Tap a style</span>
                <div className="hu-styles">
                  {ids.map((id) => {
                    const s = STYLE_CHOICES.find((x) => x.id === id)!;
                    return <button key={id} className={`hu-chip${id === style ? " on" : ""}`} aria-pressed={id === style} onClick={() => setStyle(id)}>{s.name}</button>;
                  })}
                </div>
                <p className="muted small">{STYLE_CHOICES.length} styles in all. Change any colour, font or size later.</p>
                <button className="btn big hu-go" disabled={busy} onClick={go}>{busy ? "Getting ready…" : "Get my subtitles"}</button>
                <p className="muted small">{lang.name} with English on the same timing</p>
              </>
            ) : (
              <form className="hu-account" onSubmit={signup}>
                <h3>Last step: your account</h3>
                <p className="muted small">Your video waits right here. After this, pick a plan and it opens in the editor.</p>
                <a className="google-btn" href="/api/auth/google">
                  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.8-6.8C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.7 7.1-17.1z" />
                    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
                  </svg>
                  Continue with Google
                </a>
                <p className="auth-or"><span>or</span></p>
                <label className="hu-field">Name<input name="name" autoComplete="name" required /></label>
                <label className="hu-field">Email<input name="email" type="email" autoComplete="email" required /></label>
                <label className="hu-field">Password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
                <button className="btn big hu-go" disabled={busy}>{busy ? "Please wait…" : "Create account and start"}</button>
                <p className="muted small">Have an account? <Link href="/login">Sign in</Link>, your video waits. By signing up you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.</p>
                <button type="button" className="link small" onClick={() => setStage("pick")}>Back</button>
              </form>
            )}
          </div>
        </div>
      )}
      {error && <p className="error hu-error" role="alert">{error}</p>}
      <input ref={input} type="file" accept="video/*,audio/*,.mkv" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </section>
  );
}
