import { alertOn, checkHealth } from "@/lib/health";

const EVERY_MS = 5 * 60e3;
const g = globalThis as unknown as { vsHealthTimer?: NodeJS.Timeout };

// The worker, the database, stuck or failing videos, the disk. (The worker in turn checks that this website answers.)
async function tick() {
  try { const h = await checkHealth(); await alertOn("alert_site", h.problems); } catch (e) { console.error("health check", e); }
}
if (!g.vsHealthTimer) {
  g.vsHealthTimer = setInterval(tick, EVERY_MS);
  g.vsHealthTimer.unref?.();
  setTimeout(tick, 2 * 60e3).unref?.(); // after a restart, give the worker time to start too
}
