/**
 * Is everything working? Shared by the public health check (app/api/health), the admin Server page, and the alerts
 * the website and the worker send each other's way (instrumentation-node.ts, worker.ts). No "server-only": the
 * worker imports it too.
 */
import { statfs } from "node:fs/promises";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db, jobs, settings, users } from "@/db";
import { BRAND } from "@/lib/brand";
import { emailReady, sendEmail } from "@/lib/email";
import { STORAGE } from "@/lib/media";
import { SITE_URL } from "@/lib/site";

const STUCK_MS = 15 * 60e3; // a job untouched this long while queued or running is stuck
const MIN_FREE_GB = 2;
const WORKER_STALE_MS = 90e3;
const REPEAT_MS = 3 * 3600e3; // the same problem is emailed again after this long
const NO_CREDIT = "ai_out_of_credit";

/**
 * Did the AI service refuse because the account has no credit left? Sarvam answers 402 (Payment Required) when the
 * credits run out; the wording is checked too in case a service says it another way.
 */
export function isOutOfCredit(err: unknown) {
  const m = String((err as Error)?.message ?? err);
  return /AI service error 402\b/.test(m) || /(insufficient|no|not enough|out of|exhausted)\W+(\w+\W+)?(credits?|balance)|credits?\W+(exhausted|finished|over)|quota exceeded/i.test(m);
}

/** Notes an AI error: when it's "no credit left", remembers it (shown on the admin pages, emailed). Returns whether it was. */
export async function noteAiError(err: unknown) {
  if (!isOutOfCredit(err)) return false;
  const [prev] = await db.select().from(settings).where(eq(settings.key, NO_CREDIT)).catch(() => []);
  if (!prev) {
    const value = JSON.stringify({ at: new Date().toISOString(), detail: String((err as Error)?.message ?? err).slice(0, 300) });
    await db.insert(settings).values({ key: NO_CREDIT, value }).onConflictDoNothing().catch(() => {});
  }
  return true;
}
/** An AI call worked: the credit is fine again. */
export async function noteAiWorked() {
  await db.delete(settings).where(eq(settings.key, NO_CREDIT)).catch(() => {});
}
/** Since when the AI service has been out of credit, or null. */
export async function aiOutOfCredit(): Promise<{ at: Date; detail: string } | null> {
  const [r] = await db.select().from(settings).where(eq(settings.key, NO_CREDIT)).catch(() => []);
  try { const v = r ? JSON.parse(r.value) : null; return v ? { at: new Date(v.at), detail: v.detail } : null; } catch { return null; }
}

export async function checkHealth() {
  const problems: string[] = [];
  const hour = new Date(Date.now() - 3600e3);
  let worker: Date | null = null, stuck = 0, failedHour = 0, doneHour = 0, dbOk = true;
  const disk = await statfs(STORAGE).catch(() => null);
  try {
    const [[hb], [s], [recent]] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, "worker_heartbeat")),
      db.select({ n: sql<number>`count(*)::int` }).from(jobs).where(and(inArray(jobs.status, ["queued", "processing"]), lt(jobs.updatedAt, new Date(Date.now() - STUCK_MS)))),
      db.select({
        failed: sql<number>`(count(*) filter (where ${jobs.status} = 'failed'))::int`,
        done: sql<number>`(count(*) filter (where ${jobs.status} = 'done'))::int`,
      }).from(jobs).where(gt(jobs.updatedAt, hour)),
    ]);
    worker = hb ? new Date(hb.value) : null;
    stuck = s.n; failedHour = recent.failed; doneHour = recent.done;
    if (!worker || Date.now() - worker.getTime() > WORKER_STALE_MS) problems.push("The worker isn't running, so no subtitles are being made");
    if (stuck) problems.push(`${stuck} video${stuck === 1 ? " is" : "s are"} stuck (waiting or processing for over 15 minutes)`);
    // Several failures and no success in the last hour: subtitling itself is broken (AI key, provider down).
    const noCredit = await aiOutOfCredit();
    if (noCredit) problems.push(`Sarvam has no credits left (since ${noCredit.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}), so no subtitles can be made. Top up at https://dashboard.sarvam.ai (Settings → Billing); it clears by itself once a video works`);
    if (failedHour >= 3 && !doneHour) problems.push(`${failedHour} videos failed in the last hour and none worked (AI key or AI service?)`);
  } catch {
    dbOk = false;
    problems.push("The database can't be reached");
  }
  const freeGb = disk ? (disk.bavail * disk.bsize) / 1e9 : null, totalGb = disk ? (disk.blocks * disk.bsize) / 1e9 : null;
  if (freeGb !== null && freeGb < MIN_FREE_GB) problems.push(`The disk is almost full (${freeGb.toFixed(1)} GB free)`);
  return { ok: !problems.length, problems, dbOk, worker, stuck, failedHour, doneHour, freeGb, totalGb, at: new Date() };
}

type AlertState = { key: string; at: string; problems: string[] };

async function getState(name: string): Promise<AlertState | null> {
  const [r] = await db.select().from(settings).where(eq(settings.key, name)).catch(() => []);
  try { return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function setState(name: string, s: AlertState) {
  const value = JSON.stringify(s);
  await db.insert(settings).values({ key: name, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).catch(() => {});
}

/** Emails every admin. Never throws. */
export async function emailAdmins(subject: string, text: string) {
  if (!(await emailReady().catch(() => false))) return 0;
  const admins = await db.select({ email: users.email }).from(users).where(eq(users.isAdmin, true)).catch(() => []);
  for (const a of admins) await sendEmail(a.email, subject, text).catch((e) => console.error("alert email", e));
  return admins.length;
}

/**
 * Emails the admins when something breaks (again after 3 hours if it stays broken, or at once if it changes), and
 * once more when it's all working again. `name` keeps the website's and the worker's alerts apart.
 */
export async function alertOn(name: string, problems: string[]) {
  const key = [...problems].sort().join("|"), prev = await getState(name), now = new Date();
  if (problems.length) {
    if (prev?.key === key && now.getTime() - new Date(prev.at).getTime() < REPEAT_MS) return;
    await emailAdmins(`⚠️ ${BRAND.name}: something needs a look`,
      `Something isn't working on ${SITE_URL}:\n\n${problems.map((p) => `• ${p}`).join("\n")}\n\nThe admin Server page shows more: ${SITE_URL}/admin/server\n\nYou'll get another email if it's still like this in 3 hours, and one when it's working again.`);
    await setState(name, { key, at: now.toISOString(), problems });
  } else if (prev?.key) {
    await emailAdmins(`✅ ${BRAND.name}: working again`, `Everything on ${SITE_URL} is working again.\n\nIt was:\n${prev.problems.map((p) => `• ${p}`).join("\n")}`);
    await setState(name, { key: "", at: now.toISOString(), problems: [] });
  }
}

/** The last alert of each kind, for the Server page. */
export async function alertStates() {
  return { site: await getState("alert_site"), web: await getState("alert_web") };
}
