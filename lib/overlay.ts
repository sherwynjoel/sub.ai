import { createHash } from "node:crypto";
import type { Cue } from "@/db";
import type { CaptionCustom } from "@/lib/captionStyles";

type Look = { cues: Cue[] | null; captionStyle: string; captionCustom: CaptionCustom };

/** Everything the panel's overlay is made from: when this matches the last one, the file on the server is still right. */
export const overlayKey = (j: Look, lang: string, watermark: boolean) =>
  createHash("sha1").update(JSON.stringify([j.cues, j.captionStyle, j.captionCustom, lang, watermark])).digest("hex");
