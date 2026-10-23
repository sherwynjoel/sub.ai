/** The build the server is running (next.config.ts), for open tabs to notice an update (components/UpdateBanner.tsx). */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ build: process.env.APP_BUILD ?? "" }, { headers: { "cache-control": "no-store" } });
}
