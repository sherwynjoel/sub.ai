import "server-only";
import { notFound } from "next/navigation";
import { and, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
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
      // renewals, and one-time payments as applied (the raw order.paid webhook is the same money: not counted)
      .where(and(inArray(billingEvents.type, ["subscription.charged", "order.applied"]), gt(billingEvents.createdAt, month))),
    db.select().from(users).where(and(ne(users.plan, "free"), isNotNull(users.periodEnd), gt(users.periodEnd, new Date()))),
    workerStatus(),
  ]);
  const byPlan: Partial<Record<PlanId, number>> = {};
  let mrr = 0;
  for (const s of subscribers) {
    const plan = effectivePlan(s);
    byPlan[plan] = (byPlan[plan] ?? 0) + 1;
    if (s.subscriptionStatus === "active" || s.subscriptionStatus === "prepaid") mrr += PLANS[plan].priceInr;
  }
  return { users: u, jobs: j, revenue30d: Number(rev.rupees), charges30d: rev.count, subscribers: subscribers.length, byPlan, mrr, worker };
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const when = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const mins = (sec: number) => `${Math.round(sec / 60).toLocaleString("en-IN")} min`;

/** Everything the admin dashboard (components/admin/AdminBento.tsx) draws, worked out here from the database. */
export async function dashboard() {
  const now = new Date(), day = 864e5;
  const [all, [act], months, recent, [ops], o] = await Promise.all([
    db.select({ id: users.id, email: users.email, plan: users.plan, periodEnd: users.periodEnd, secondsUsed: users.secondsUsed, createdAt: users.createdAt }).from(users),
    db.select({
      d7: sql<number>`(count(distinct ${jobs.userId}) filter (where ${jobs.createdAt} > now() - interval '7 days'))::int`,
      d30: sql<number>`(count(distinct ${jobs.userId}) filter (where ${jobs.createdAt} > now() - interval '30 days'))::int`,
    }).from(jobs),
    db.select({ m: sql<string>`to_char(date_trunc('month', ${jobs.createdAt}), 'YYYY-MM')`, n: sql<number>`count(*)::int`, sec: sql<number>`coalesce(sum(${jobs.durationSec}), 0)::float` })
      .from(jobs).where(gt(jobs.createdAt, new Date(now.getTime() - 200 * day))).groupBy(sql`1`),
    db.select().from(billingEvents).where(inArray(billingEvents.type, ["order.applied", "subscription.charged"])).orderBy(sql`${billingEvents.createdAt} desc`).limit(4),
    db.select({
      queued: sql<number>`(count(*) filter (where ${jobs.status} = 'queued'))::int`,
      failedToday: sql<number>`(count(*) filter (where ${jobs.status} = 'failed' and ${jobs.createdAt} > now() - interval '1 day'))::int`,
    }).from(jobs),
    overview(),
  ]);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  // Sign-ups per day, by what each user is now (paying, or on the free trial).
  const perDay = new Map<string, { trial: number; paid: number }>();
  const byPlan: Record<PlanId, number> = { free: 0, creator: 0, pro: 0, studio: 0 };
  for (const u of all) {
    const p = effectivePlan(u, now), k = ymd(u.createdAt), row = perDay.get(k) ?? { trial: 0, paid: 0 };
    row[p === "free" ? "trial" : "paid"]++;
    perDay.set(k, row);
    byPlan[p]++;
  }
  const signupsByMonth = new Map<string, number>();
  for (const u of all) { const m = ymd(u.createdAt).slice(0, 7); signupsByMonth.set(m, (signupsByMonth.get(m) ?? 0) + 1); }
  const last6 = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const owner = new Map(all.map((u) => [u.id, u.email]));
  type Evt = { userId?: string; plan?: string; payload?: { payment?: { entity?: { amount?: number } }; subscription?: { entity?: { notes?: { userId?: string }; plan_id?: string } } } };
  return {
    at: now.toISOString(),
    total: all.length,
    days: [...perDay].map(([d, v]) => ({ d, ...v })).sort((a, b) => a.d.localeCompare(b.d)),
    active7: act.d7, active30: act.d30,
    byPlan,
    paid: o.subscribers, mrr: o.mrr, revenue30d: o.revenue30d, charges30d: o.charges30d,
    months: last6.map((m) => ({ m, signups: signupsByMonth.get(m) ?? 0, projects: months.find((x) => x.m === m)?.n ?? 0, minutes: Math.round((months.find((x) => x.m === m)?.sec ?? 0) / 60) })),
    week: Array.from({ length: 7 }, (_, i) => { const d = new Date(now.getTime() - (6 - i) * day), k = ymd(d); const v = perDay.get(k); return { d: k, n: (v?.trial ?? 0) + (v?.paid ?? 0) }; }),
    payments: recent.map((e) => {
      const p = e.payload as Evt, uid = p.userId ?? p.payload?.subscription?.entity?.notes?.userId;
      return { email: (uid && owner.get(uid)) || "—", plan: p.plan ?? "subscription", rupees: (p.payload?.payment?.entity?.amount ?? 0) / 100, at: e.createdAt.toISOString() };
    }),
    worker: o.worker.online, queued: ops.queued, failedToday: ops.failedToday, minutes30d: o.jobs.minutes30d, jobsToday: o.jobs.today,
  };
}
export type Dashboard = Awaited<ReturnType<typeof dashboard>>;
