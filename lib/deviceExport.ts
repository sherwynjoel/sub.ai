import type { FFmpeg as Engine } from "@ffmpeg/ffmpeg";
import type { AudioTrack } from "@/lib/audioTrack";
import { LOGO, OUT, readVideo, VIDEO, type Plan, type VideoInfo } from "@/lib/renderPlan";

/**
 * Makes a project's video on the user's own device: ffmpeg in WebAssembly carries out the plan the server wrote
 * (lib/renderPlan.ts). Threads need a cross-origin isolated page (next.config.ts); without one it runs on a single
 * thread, about 4x slower. The video is read from its file as needed, so only the finished MP4 sits in memory.
 */
export type Step = { step: string; pct: number };

const ENGINE: string = "/ffmpeg/index.js";

/** ffmpeg's own threading of filters hangs in WebAssembly on looks with many layers; one filter thread doesn't. */
const THREADS = ["-filter_threads", "1", "-filter_complex_threads", "1", "-threads", "4"];

const bytes = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch ${url}`);
  return new Uint8Array(await res.arrayBuffer());
};

/** A file from the server, reporting how much of it has arrived. */
async function fetchVideo(url: string, signal: AbortSignal, onPct: (pct: number) => void) {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error("The video couldn't be fetched.");
  const total = +(res.headers.get("content-length") ?? 0), parts: Uint8Array<ArrayBuffer>[] = [];
  let got = 0;
  for (const reader = res.body.getReader(); ;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    if (total) onPct(Math.floor((got / total) * 100));
  }
  return new Blob(parts);
}

// Loaded from public/ffmpeg, as it is: the bundler can't follow how it starts its worker.
const newEngine = async () => new ((await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ ENGINE)) as { FFmpeg: typeof Engine }).FFmpeg();
const threads = () => (self.crossOriginIsolated ? THREADS : []);
function start(ff: Engine, signal?: AbortSignal) {
  const core = `/ffmpeg/${self.crossOriginIsolated ? "mt" : "st"}/ffmpeg-core`;
  return ff.load({ classWorkerURL: "/ffmpeg/worker.js", coreURL: `${core}.js`, wasmURL: `${core}.wasm`, ...(self.crossOriginIsolated ? { workerURL: `${core}.worker.js` } : {}) }, { signal });
}

/** The sound of a file lib/audioTrack.ts can't read (WebM, MKV), as AAC for api/upload?audio=1; null without any sound. */
export async function soundOnDevice(file: Blob): Promise<AudioTrack | null> {
  const ff = await newEngine();
  try {
    await start(ff);
    await ff.createDir("/in");
    await ff.mount("WORKERFS" as never, { blobs: [{ name: "video", data: file }] }, "/in");
    let seconds = 0;
    ff.on("log", ({ message }) => {
      const m = message.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (m) seconds = +m[1] * 3600 + +m[2] * 60 + +m[3];
    });
    if (await ff.exec(["-y", ...threads(), "-i", "/in/video", "-map", "0:a:0", "-c:a", "aac", "-b:a", "192k", "-f", "adts", "sound.aac"])) return null;
    return { adts: new Blob([(await ff.readFile("sound.aac")) as Uint8Array<ArrayBuffer>]), frames: 0, seconds, shift: 0 };
  } finally {
    ff.terminate();
  }
}

export async function renderOnDevice(o: {
  video: Blob | string; logo?: string; signal: AbortSignal; onStep: (s: Step) => void;
  plan: (video: VideoInfo) => Promise<{ plan: Plan; fonts: string[]; seconds: number }>;
}) {
  const { signal, onStep } = o;
  const ff = await newEngine();
  const stop = () => ff.terminate();
  signal.addEventListener("abort", stop);
  try {
    onStep({ step: "Getting the video engine", pct: 0 });
    await start(ff, signal);

    const video = typeof o.video === "string"
      ? await fetchVideo(o.video, signal, (pct) => onStep({ step: "Getting your video", pct }))
      : o.video;
    await ff.createDir("/in");
    await ff.mount("WORKERFS" as never, { blobs: [{ name: "video", data: video }] }, "/in");
    // What's in the file (ffmpeg prints it, then stops for want of an output).
    const said: string[] = [], listen = ({ message }: { message: string }) => { said.push(message); };
    ff.on("log", listen);
    await ff.exec(["-hide_banner", "-i", "/in/video"]);
    ff.off("log", listen);
    const { plan, fonts, seconds } = await o.plan(readVideo(said.join("\n")));

    onStep({ step: "Getting the fonts", pct: 0 });
    await ff.createDir("fonts");
    await Promise.all(fonts.map(async (f) => ff.writeFile(`fonts/${f}`, await bytes(`/caption-fonts/${encodeURIComponent(f)}`))));
    for (const [name, text] of Object.entries(plan.files)) await ff.writeFile(name, text);
    if (o.logo) await ff.writeFile("logo", await bytes(o.logo));

    const out = "out.mp4";
    ff.on("log", ({ message }) => {
      const m = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (m) onStep({ step: "Making your video", pct: Math.min(99, Math.floor(((+m[1] * 3600 + +m[2] * 60 + +m[3]) / Math.max(1, seconds)) * 100)) });
    });
    onStep({ step: "Making your video", pct: 0 });
    const args = plan.args.map((a) => (a === VIDEO ? "/in/video" : a === LOGO ? "logo" : a === OUT ? out : a));
    const code = await ff.exec(["-y", ...threads(), ...args]);
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    const data = await ff.readFile(out);
    return new Blob([data as Uint8Array<ArrayBuffer>], { type: "video/mp4" });
  } finally {
    signal.removeEventListener("abort", stop);
    ff.terminate();
  }
}
