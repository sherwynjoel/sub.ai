import { checkHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Uptime check (for any uptime monitor; the site also checks itself every 5 minutes, instrumentation-node.ts): 200 when everything works,
 * 503 with the problems listed. Public, so it says only what is wrong, nothing about users or projects.
 */
export async function GET() {
  const h = await checkHealth();
  return Response.json({ ok: h.ok, problems: h.problems, at: h.at.toISOString() }, { status: h.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
