import "server-only";
import { notFound } from "next/navigation";
import { and, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import { billingEvents, db, jobs, settings, users } from "@/db";
import { currentUser, requireUser } from "@/lib/auth";
import { PLANS, effectivePlan, type PlanId } from "@/lib/plans";

/** Pages: 404 for non-admins (don't reveal the admin area exists). */
export async function requireAdmin() {
  const u = await requireUser();
  if (!u.isAdmin) notFound();
  return u;
}

/** API routes: null for non-admins. */
export async function adminOrNull() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

const WORKER_STALE_MS = 90e3;

export async function workerStatus() {
  const [row] = await db.select().from(settings).where(eq(settings.key, "worker_heartbeat"));
  const last = row ? new Date(row.value) : null;
  return { online: !!last && Date.now() - last.getTime() < WORKER_STALE_MS, last };
}

/** Amount (₹) of a subscription.charged event, from Razorpay's payment entity (paise). */
export const chargedRupees = sql<number>`coalesce(sum((${billingEvents.payload}->'payload'->'payment'->'entity'->>'amount')::numeric) / 100, 0)`;

export async function overview() {
  const month = new Date(Date.now() - 30 * 864e5);
  const [[u], [j], [rev], subscribers, worker] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      new7d: sql<number>`(count(*) filter (where ${users.createdAt} > now() - interval '7 days'))::int`,
    }).from(users),
    db.select({
      queued: sql<number>`(count(*) filter (where ${jobs.status} = 'queued'))::int`,
      processing: sql<number>`(count(*) filter (where ${jobs.status} = 'processing'))::int`,
      today: sql<number>`(count(*) filter (where ${jobs.createdAt} > now() - interval '1 day'))::int`,
      failedToday: sql<number>`(count(*) filter (where ${jobs.status} = 'failed' and ${jobs.createdAt} > now() - interval '1 day'))::int`,
      minutes30d: sql<number>`coalesce(round(sum(${jobs.durationSec}) filter (where ${jobs.status} = 'done' and ${jobs.createdAt} > now() - interval '30 days') / 60), 0)::int`,
    }).from(jobs),
    db.select({ rupees: chargedRupees, count: sql<number>`count(*)::int` }).from(billingEvents)
      .where(and(eq(billingEvents.type, "subscription.charged"), gt(billingEvents.createdAt, month))),
    db.select().from(users).where(and(ne(users.plan, "free"), isNotNull(users.periodEnd), gt(users.periodEnd, new Date()))),
    workerStatus(),
  ]);
  const byPlan: Partial<Record<PlanId, number>> = {};
  let mrr = 0;
  for (const s of subscribers) {
    const plan = effectivePlan(s);
    byPlan[plan] = (byPlan[plan] ?? 0) + 1;
    if (s.subscriptionStatus === "active") mrr += PLANS[plan].priceInr;
  }
  return { users: u, jobs: j, revenue30d: Number(rev.rupees), charges30d: rev.count, subscribers: subscribers.length, byPlan, mrr, worker };
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const when = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const mins = (sec: number) => `${Math.round(sec / 60).toLocaleString("en-IN")} min`;
