/**
 * Videos sent after their sound (browser only). The sound goes first (api/upload?audio=1) so captioning starts at
 * once; the video follows here in pieces, 3 at a time, each sent again if the network drops (waiting for it to come
 * back), and a page reopened later can finish the job with the same file (the server says which pieces it has).
 * Meanwhile the editor plays the phone's own copy (`url`), so nobody waits for the upload to edit.
 */

export type VideoUpload = { jobId: string; name: string; url: string; sent: number; total: number; state: "sending" | "done" | "failed"; error?: string };

const ups = new Map<string, VideoUpload & { file: File; inflight: Map<number, number> }>();
const subs = new Set<() => void>();
let version = 0;
const emit = () => { version++; subs.forEach((f) => f()); };

export const subscribeUploads = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const uploadsVersion = () => version;
/** This tab's upload of a project's video (and its local copy to play), if any. */
export const localVideo = (jobId: string): VideoUpload | undefined => ups.get(jobId);
export const sendingVideos = () => [...ups.values()].filter((u) => u.state === "sending");
export const progressOf = (u: VideoUpload) => Math.min(100, Math.floor((100 * u.sent) / Math.max(1, u.total)));

const PARALLEL = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const online = () => (typeof navigator === "undefined" || navigator.onLine ? Promise.resolve() : new Promise<void>((r) => addEventListener("online", () => r(), { once: true })));

// Keep the screen on while sending (a locked phone stops uploads), and ask before leaving the page.
let lock: { release: () => Promise<void> } | null = null;
async function keepAwake(on: boolean) {
  try {
    if (on && !lock) lock = await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
    if (!on && lock) { await lock.release(); lock = null; }
  } catch { /* not supported: fine */ }
}
if (typeof window !== "undefined") {
  addEventListener("beforeunload", (e) => { if (sendingVideos().length) e.preventDefault(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && sendingVideos().length) keepAwake(true); });
}

/** One piece by XHR (for its progress); resolves with the HTTP status (0 = network error). */
function putPiece(jobId: string, i: number, body: Blob, onBytes: (n: number) => void) {
  return new Promise<number>((resolve) => {
    const x = new XMLHttpRequest();
    x.open("PUT", `/api/jobs/${jobId}/video?i=${i}`);
    x.upload.onprogress = (e) => onBytes(e.loaded);
    x.onload = () => resolve(x.status);
    x.onerror = x.ontimeout = x.onabort = () => resolve(0);
    x.timeout = 5 * 60_000;
    x.send(body);
  });
}

async function getJson(url: string, init?: RequestInit) {
  for (let attempt = 0; ; attempt++) {
    await online();
    const res = await fetch(url, init).catch(() => null);
    if (res && res.status < 500) return { status: res.status, body: await res.json().catch(() => ({})) };
    await sleep(Math.min(30_000, 1000 * 2 ** attempt));
  }
}

/** Send (or finish sending) a project's video. Safe to call again: it carries on from what the server has. */
export async function sendVideo(jobId: string, file: File) {
  const old = ups.get(jobId);
  if (old?.state === "sending") return;
  const up = old ?? { jobId, name: file.name, url: URL.createObjectURL(file), sent: 0, total: file.size, state: "sending" as const, file, inflight: new Map() };
  Object.assign(up, { file, state: "sending", error: undefined, inflight: new Map() });
  ups.set(jobId, up);
  emit();
  keepAwake(true);
  const fail = (error: string) => { Object.assign(up, { state: "failed", error }); emit(); if (!sendingVideos().length) keepAwake(false); };

  const st = await getJson(`/api/jobs/${jobId}/video`);
  if (st.status === 409) { Object.assign(up, { state: "done", sent: up.total }); emit(); keepAwake(false); return; } // already here
  if (st.status !== 200) return fail(st.body.error || "Couldn't send the video.");
  const { total, piece, have } = st.body as { total: number; piece: number; have: number[] };
  if (total !== file.size) return fail("That's not the same file as this project's (its size is different).");
  const count = Math.ceil(total / piece), got = new Set(have);
  const size = (i: number) => Math.min(piece, total - i * piece);
  let done = have.reduce((n, i) => n + size(i), 0);
  const show = () => { up.sent = done + [...up.inflight.values()].reduce((a, b) => a + b, 0); emit(); };
  show();

  const todo = Array.from({ length: count }, (_, i) => i).filter((i) => !got.has(i));
  let next = 0, broken = "";
  const worker = async () => {
    while (next < todo.length && !broken) {
      const i = todo[next++];
      for (let attempt = 0; !broken; attempt++) {
        await online();
        const status = await putPiece(jobId, i, file.slice(i * piece, i * piece + size(i)), (n) => { up.inflight.set(i, n); show(); });
        up.inflight.delete(i);
        if (status >= 200 && status < 300) { done += size(i); show(); break; }
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) { broken = `The upload was refused (${status}).`; break; }
        show();
        await sleep(Math.min(30_000, 1000 * 2 ** attempt)); // network or server hiccup: try that piece again
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  if (broken) return fail(broken);
  const end = await getJson(`/api/jobs/${jobId}/video`, { method: "POST" });
  if (end.status !== 200) return fail(end.body.error || "Couldn't finish the upload.");
  Object.assign(up, { state: "done", sent: up.total });
  emit();
  if (!sendingVideos().length) keepAwake(false);
}
