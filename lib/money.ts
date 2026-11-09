import "server-only";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { billingEvents, creditLog, db, settings, users } from "@/db";
import { PLANS, type PlanId } from "@/lib/plans";
import { measuredCostByMonth } from "@/lib/aiPrices";

type Pay = { id?: string; amount?: number; email?: string; contact?: string; error_description?: string; error_reason?: string; method?: string; notes?: { userId?: string }; order_id?: string };
type Evt = {
  userId?: string; plan?: string; orderId?: string; amount?: number;
  payload?: { payment?: { entity?: Pay }; refund?: { entity?: { amount?: number; payment_id?: string } }; subscription?: { entity?: { notes?: { userId?: string }; plan_id?: string } } };
};

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD in India
const COST_KEY = "ai_cost_per_min";

/** What the admin says one minute of subtitling costs in AI fees (₹), for the profit estimate. */
export async function aiCostPerMin() {
  const [r] = await db.select().from(settings).where(eq(settings.key, COST_KEY));
  return r ? Number(r.value) || 0 : 0;
}
export async function setAiCostPerMin(rupees: number) {
  await db.insert(settings).values({ key: COST_KEY, value: String(rupees) }).onConflictDoUpdate({ target: settings.key, set: { value: String(rupees) } });
}

/** Money in, money back, payments that failed or were never finished, and what the AI cost, for the Revenue page. */
export async function money() {
  const now = new Date(), year = new Date(now.getTime() - 400 * 864e5), month = new Date(now.getTime() - 30 * 864e5);
  const [paid, refunds, failed, started, usage, cost, people, measured] = await Promise.all([
    db.select().from(billingEvents).where(and(inArray(billingEvents.type, ["order.applied", "subscription.charged"]), gt(billingEvents.createdAt, year))).orderBy(desc(billingEvents.createdAt)),
    db.select().from(billingEvents).where(and(inArray(billingEvents.type, ["refund.processed", "refund.created"]), gt(billingEvents.createdAt, year))).orderBy(desc(billingEvents.createdAt)),
    db.select().from(billingEvents).where(and(eq(billingEvents.type, "payment.failed"), gt(billingEvents.createdAt, month))).orderBy(desc(billingEvents.createdAt)).limit(50),
    db.select().from(billingEvents).where(and(eq(billingEvents.type, "checkout.started"), gt(billingEvents.createdAt, month))).orderBy(desc(billingEvents.createdAt)).limit(200),
    // Minutes made into subtitles each month (what the AI was paid for; given-back minutes subtracted).
    db.select({ m: sql<string>`to_char(${creditLog.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM')`, sec: sql<number>`coalesce(sum(${creditLog.seconds}), 0)::float` })
      .from(creditLog).where(and(gt(creditLog.createdAt, year), inArray(creditLog.kind, ["upload", "translate", "remake", "extra", "refund"]))).groupBy(sql`1`),
    aiCostPerMin(),
    db.select({ id: users.id, email: users.email, name: users.name }).from(users),
    measuredCostByMonth(),
  ]);
  const who = new Map(people.map((p) => [p.id, p]));
  const rupees = (e: Evt) => (e.payload?.payment?.entity?.amount ?? 0) / 100;
  const userOf = (e: Evt) => e.userId ?? e.payload?.subscription?.entity?.notes?.userId ?? e.payload?.payment?.entity?.notes?.userId;

  // By month (last 12) and by day (last 30).
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const byMonth = new Map(months.map((m) => [m, { m, income: 0, payments: 0, refunds: 0, minutes: 0 }]));
  const days = Array.from({ length: 30 }, (_, i) => ymd(new Date(now.getTime() - (29 - i) * 864e5)));
  const byDay = new Map(days.map((d) => [d, 0]));
  const byPlan: Record<string, { n: number; rupees: number }> = {};
  for (const e of paid) {
    const p = e.payload as Evt, r = rupees(p), d = ymd(e.createdAt);
    const row = byMonth.get(d.slice(0, 7)); if (row) { row.income += r; row.payments++; }
    if (byDay.has(d)) byDay.set(d, byDay.get(d)! + r);
    const plan = p.plan && p.plan in PLANS ? PLANS[p.plan as PlanId].name : "Monthly subscription";
    (byPlan[plan] ??= { n: 0, rupees: 0 }).n++; byPlan[plan].rupees += r;
  }
  for (const e of refunds) { const row = byMonth.get(ymd(e.createdAt).slice(0, 7)); if (row) row.refunds += ((e.payload as Evt).payload?.refund?.entity?.amount ?? 0) / 100; }
  for (const u of usage) { const row = byMonth.get(u.m); if (row) row.minutes = Math.max(0, u.sec) / 60; }

  // Checkouts started but never paid (the order never got applied), older than 15 minutes.
  const appliedOrders = new Set(paid.map((e) => (e.payload as Evt).orderId).filter(Boolean));
  const unfinished = started.filter((e) => !appliedOrders.has((e.payload as Evt).orderId) && now.getTime() - e.createdAt.getTime() > 15 * 60e3)
    .map((e) => { const p = e.payload as Evt; return { at: e.createdAt, user: who.get(p.userId ?? ""), plan: p.plan && p.plan in PLANS ? PLANS[p.plan as PlanId].name : p.plan, rupees: (p.amount ?? 0) / 100 }; });

  return {
    cost,
    // The measured AI cost (lib/aiPrices.ts) where there is one; earlier months use the admin's ₹ per minute.
    months: [...byMonth.values()].map((r) => {
      const m = measured.get(r.m), aiCost = m ?? r.minutes * cost;
      return { ...r, aiCost, measured: m !== undefined, known: m !== undefined || cost > 0, profit: r.income - r.refunds - aiCost };
    }),
    days: [...byDay].map(([d, r]) => ({ d, r })),
    byPlan: Object.entries(byPlan).sort((a, b) => b[1].rupees - a[1].rupees),
    recent: paid.slice(0, 30).map((e) => ({ at: e.createdAt, user: who.get(userOf(e.payload as Evt) ?? ""), plan: (e.payload as Evt).plan, rupees: rupees(e.payload as Evt), type: e.type })),
    failed: failed.map((e) => { const pay = (e.payload as Evt).payload?.payment?.entity ?? {}; return { at: e.createdAt, user: who.get(pay.notes?.userId ?? ""), email: pay.email, phone: pay.contact, rupees: (pay.amount ?? 0) / 100, why: pay.error_description || pay.error_reason || "—", method: pay.method }; }),
    unfinished,
    refunds: refunds.slice(0, 20).map((e) => ({ at: e.createdAt, rupees: ((e.payload as Evt).payload?.refund?.entity?.amount ?? 0) / 100, payment: (e.payload as Evt).payload?.refund?.entity?.payment_id })),
  };
}
