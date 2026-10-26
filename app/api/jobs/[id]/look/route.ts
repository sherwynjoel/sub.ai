import { currentUser, json, unauthorized } from "@/lib/auth";
import { CAPTION_FONTS, resolveStyle, STYLE_CHOICES, SAFE_ZONES } from "@/lib/captionStyles";
import { ownJob } from "@/lib/jobs";

/** The job's caption look for the Adobe panel: values for its controls, plus the resolved look After Effects applies. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  const portrait = new URL(req.url).searchParams.get("portrait") === "1";
  const s = resolveStyle(j.captionStyle, j.captionCustom, portrait);
  return json({
    styleId: j.captionStyle,
    custom: j.captionCustom,
    look: {
      font: s.font, size: s.size ?? 1, color: s.color, accent: s.mark ?? s.keyword?.color ?? s.active ?? null,
      outline: s.outline ?? null, box: s.box ?? null, caps: !!s.caps, lower: !!s.lower,
      position: s.position, offset: s.offset, lines: s.lines ?? null, x: s.x ?? null, y: s.y ?? null,
      safe: s.safe, safeId: j.captionCustom.safe ?? "none",
    },
    styles: STYLE_CHOICES.map((x) => ({ id: x.id, name: x.name, group: x.group })),
    fonts: CAPTION_FONTS,
    safeZones: Object.entries(SAFE_ZONES).map(([id, z]) => ({ id, name: z.name })),
  });
}
