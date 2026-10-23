/**
 * Caption types: what a project's captions say and how they're written, chosen on upload or changed in the editor.
 * Stored as the job's script (how the main line is written, or "translated"), withEnglish and captionCustom.show.
 */
export type CaptionType = "spoken" | "roman" | "native" | "english" | "translated";
/** How the main line is written: the speech-to-text scripts (lib/ai/shared.ts), or a translation of English speech. */
export const JOB_SCRIPTS = ["mixed", "roman", "native", "translated"] as const;
export type JobScript = (typeof JOB_SCRIPTS)[number];
export type Show = "ta" | "en" | "both";

type Def = { id: CaptionType; title: (lang: string) => string; note: (lang: string) => string; sample?: string; english: "line" | "always" | "never" };
/** The choices, in order. Samples are Tamil (the default language); other languages show the note only. */
export const CAPTION_TYPES: Def[] = [
  { id: "spoken", title: (l) => l, note: () => "As spoken. English words stay in English.", sample: "இந்த song தான் என் favourite", english: "line" },
  { id: "roman", title: (l) => (l === "Tamil" ? "Tanglish" : `${l} in English letters`), note: (l) => `${l} written in English letters.`, sample: "Indha song dhaan en favourite", english: "line" },
  { id: "native", title: (l) => `Pure ${l}`, note: (l) => `Everything in ${l} letters, English words too.`, sample: "இந்த சாங் தான் என் ஃபேவரைட்", english: "line" },
  { id: "english", title: () => "English", note: (l) => `The ${l} speech translated into English.`, sample: "This song is my favourite", english: "never" },
  { id: "translated", title: (l) => `Translate to ${l}`, note: (l) => `For videos in English: captions translated into ${l}.`, sample: "இந்த song எனக்கு ரொம்ப பிடிக்கும்", english: "line" },
];

/** Upload and job settings for a caption type, with or without the English line underneath. */
export function typeSettings(type: CaptionType, withEnglish: boolean): { script: JobScript; show: Show; english: boolean } {
  if (type === "english") return { script: "mixed", show: "en", english: true };
  const script: JobScript = type === "spoken" ? "mixed" : type;
  return { script, show: withEnglish ? "both" : "ta", english: withEnglish };
}

/** The caption type of a job's settings. */
export function typeOf(job: { script: string; captionCustom?: { show?: Show } | null }): { type: CaptionType; withEnglish: boolean } {
  const show = job.captionCustom?.show ?? "both";
  if (show === "en") return { type: "english", withEnglish: false };
  const type: CaptionType = job.script === "translated" ? "translated" : job.script === "roman" ? "roman" : job.script === "native" ? "native" : "spoken";
  return { type, withEnglish: show === "both" };
}

/** A short name for a job's captions, e.g. "Tanglish + English". */
export function typeLabel(job: { script: string; captionCustom?: { show?: Show } | null }, language: string) {
  const { type, withEnglish } = typeOf(job);
  const name = CAPTION_TYPES.find((t) => t.id === type)!.title(language);
  return withEnglish ? `${name} + English` : name;
}

/** How many times a project's captions can be redone from the video without using minutes. */
export const MAX_REDOS = 3;
