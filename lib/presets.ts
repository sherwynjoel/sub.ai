import { CAPTION_STYLES, sanitizeCustom, type CaptionCustom } from "@/lib/captionStyles";

/** The most presets one account keeps. */
export const MAX_PRESETS = 30;

/**
 * What a preset keeps of a project's look: everything but the parts that belong to one video (canvas, text layers,
 * logo, and which lines it shows: a preset made on an English-only project mustn't hide another's Tamil line).
 */
export function presetLook(input: unknown): CaptionCustom {
  const out = sanitizeCustom(input);
  delete out.canvas; delete out.layers; delete out.logo; delete out.show;
  return out;
}

/** A preset's name, trimmed to something that fits a chip; null when there's none. */
export const presetName = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ").slice(0, 40) : null);

/** A style that exists (offered or not: a preset made on an older style keeps it). */
export const knownStyle = (v: unknown): v is string => typeof v === "string" && CAPTION_STYLES.some((s) => s.id === v);

/** A preset's look applied to a project: its own video parts (canvas, text layers, logo) stay. */
export function applyPreset(project: CaptionCustom, preset: CaptionCustom): CaptionCustom {
  const kept: CaptionCustom = {};
  if (project.canvas) kept.canvas = project.canvas;
  if (project.layers) kept.layers = project.layers;
  if (project.logo) kept.logo = project.logo;
  if (project.show) kept.show = project.show;
  return { ...presetLook(preset), ...kept };
}
