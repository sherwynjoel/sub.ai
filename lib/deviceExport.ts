import type { FFmpeg as Engine } from "@ffmpeg/ffmpeg";
import { LOGO, OUT, VIDEO, type Plan } from "@/lib/renderPlan";

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

export async function renderOnDevice(o: {
  plan: Plan; fonts: string[]; seconds: number; video: Blob | string; logo?: string; signal: AbortSignal; onStep: (s: Step) => void;
}) {
  const { plan, seconds, signal, onStep } = o;
  // Loaded from public/ffmpeg, as it is: the bundler can't follow how it starts its worker.
  const { FFmpeg } = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ ENGINE)) as { FFmpeg: typeof Engine };
  const ff = new FFmpeg();
  const stop = () => ff.terminate();
  signal.addEventListener("abort", stop);
  try {
    onStep({ step: "Getting the video engine", pct: 0 });
    const threads = self.crossOriginIsolated, core = `/ffmpeg/${threads ? "mt" : "st"}/ffmpeg-core`;
    await ff.load({ classWorkerURL: "/ffmpeg/worker.js", coreURL: `${core}.js`, wasmURL: `${core}.wasm`, ...(threads ? { workerURL: `${core}.worker.js` } : {}) }, { signal });

    const video = typeof o.video === "string"
      ? await fetchVideo(o.video, signal, (pct) => onStep({ step: "Getting your video", pct }))
      : o.video;
    onStep({ step: "Getting the fonts", pct: 0 });
    await ff.createDir("/in");
    await ff.mount("WORKERFS" as never, { blobs: [{ name: "video", data: video }] }, "/in");
    await ff.createDir("fonts");
    await Promise.all(o.fonts.map(async (f) => ff.writeFile(`fonts/${f}`, await bytes(`/caption-fonts/${encodeURIComponent(f)}`))));
    for (const [name, text] of Object.entries(plan.files)) await ff.writeFile(name, text);
    if (o.logo) await ff.writeFile("logo", await bytes(o.logo));

    const out = "out.mp4";
    ff.on("log", ({ message }) => {
      const m = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (m) onStep({ step: "Making your video", pct: Math.min(99, Math.floor(((+m[1] * 3600 + +m[2] * 60 + +m[3]) / Math.max(1, seconds)) * 100)) });
    });
    onStep({ step: "Making your video", pct: 0 });
    const args = plan.args.map((a) => (a === VIDEO ? "/in/video" : a === LOGO ? "logo" : a === OUT ? out : a));
    const code = await ff.exec(["-y", ...(threads ? THREADS : []), ...args]);
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    const data = await ff.readFile(out);
    return new Blob([data as Uint8Array<ArrayBuffer>], { type: "video/mp4" });
  } finally {
    signal.removeEventListener("abort", stop);
    ff.terminate();
  }
}
