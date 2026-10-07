import type { Cue } from "@/db/schema";

export type Lang = "ta" | "en" | "both";

function stamp(sec: number, sep: "," | ".") {
  const ms = Math.round(Math.max(0, sec) * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)}${sep}${p(ms % 1000, 3)}`;
}

const text = (c: Cue, lang: Lang) => (lang === "both" ? `${c.ta}\n${c.en}` : c[lang]).trim();

export function toSrt(cues: Cue[], lang: Lang) {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${text(c, lang)}\n`).join("\n");
}

export function toVtt(cues: Cue[], lang: Lang) {
  return "WEBVTT\n\n" + cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${text(c, lang)}\n`).join("\n");
}

export function toTxt(cues: Cue[], lang: Lang) {
  return cues.map((c) => text(c, lang)).join("\n");
}

/** Shift chunk-relative cues to absolute time, clamp them inside the chunk, drop empties, sort. */
export function mergeChunks(chunks: { offset: number; duration: number; cues: Cue[] }[]): Cue[] {
  return chunks
    .flatMap(({ offset, duration, cues }) =>
      cues
        .map((c) => ({
          start: offset + Math.min(Math.max(0, c.start), duration),
          end: offset + Math.min(Math.max(0, c.end), duration),
          ta: (c.ta ?? "").trim(),
          en: (c.en ?? "").trim(),
        }))
        .filter((c) => c.end > c.start && (c.ta || c.en)),
    )
    .sort((a, b) => a.start - b.start);
}
