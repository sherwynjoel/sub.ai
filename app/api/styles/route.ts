import { CAPTION_FONTS, DEFAULT_STYLE, STYLE_CHOICES, SAFE_ZONES } from "@/lib/captionStyles";

/** The caption styles and fonts, for the Adobe panel's style picker (public, same list the website shows). */
export function GET() {
  return Response.json({ styles: STYLE_CHOICES.map((s) => ({ id: s.id, name: s.name, group: s.group })), fonts: CAPTION_FONTS, defaultStyle: DEFAULT_STYLE,
    safeZones: Object.entries(SAFE_ZONES).filter(([id]) => id !== "custom").map(([id, z]) => ({ id, name: z.name })) });
}
