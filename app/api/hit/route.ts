import { createHash } from "node:crypto";
import { db, pageViews } from "@/db";

const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|curl|wget|python|monitor/i;
/** Today in India (the day the counts are grouped by). */
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const clip = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/** One page visit from components/Track.tsx. Always 204: a visitor never sees an error from counting. */
export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    const body = await req.json().catch(() => ({}));
    const path = clip(body.p, 200);
    if (!ua || BOTS.test(ua) || !path?.startsWith("/") || /^\/(admin|api)\b/.test(path)) return new Response(null, { status: 204 });
    let referrer: string | null = null;
    try {
      const host = new URL(String(body.r)).hostname.replace(/^www\./, "");
      if (host && host !== new URL(req.url).hostname && host !== req.headers.get("host")?.split(":")[0]) referrer = host;
    } catch {}
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
    const day = today();
    const visitor = createHash("sha256").update(`${day}|${ip}|${ua}|${process.env.SETTINGS_SECRET ?? ""}`).digest("hex").slice(0, 16);
    await db.insert(pageViews).values({ day, path, referrer, source: clip(body.s, 60)?.toLowerCase() ?? null, visitor });
  } catch {}
  return new Response(null, { status: 204 });
}
