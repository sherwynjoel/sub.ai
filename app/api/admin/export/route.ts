import { desc, inArray } from "drizzle-orm";
import { billingEvents, db, users } from "@/db";
import { adminOrNull, logAdmin } from "@/lib/admin";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";

// Text starting with = + - @ would run as a formula in Excel: such text gets a leading '. Numbers are left alone.
const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  const risky = /^[=+\-@]/.test(s) && Number.isNaN(Number(s));
  return /[",\n]/.test(s) || risky ? `"${(risky ? "'" : "") + s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** Users or payments as a CSV file (opens in Excel), for accounts and GST. */
export async function GET(req: Request) {
  const me = await adminOrNull();
  if (!me) return new Response("Admins only.", { status: 403 });
  const what = new URL(req.url).searchParams.get("what");
  let rows: unknown[][];
  if (what === "users") {
    const all = await db.select().from(users).orderBy(desc(users.createdAt));
    rows = [["Name", "Email", "Plan now", "Minutes left", "Pass ends", "Joined", "Email confirmed", "Blocked"],
      ...all.map((u) => [u.name, u.email, PLANS[effectivePlan(u)].name, Math.round(secondsLeft(u) / 60), u.periodEnd, u.createdAt, u.emailVerifiedAt ? "yes" : "no", u.blockedAt ? "yes" : "no"])];
  } else if (what === "payments") {
    const [all, people] = await Promise.all([
      db.select().from(billingEvents).where(inArray(billingEvents.type, ["order.applied", "subscription.charged", "refund.processed"])).orderBy(desc(billingEvents.createdAt)),
      db.select({ id: users.id, email: users.email, name: users.name }).from(users),
    ]);
    const who = new Map(people.map((p) => [p.id, p]));
    type P = { userId?: string; plan?: string; orderId?: string; paymentId?: string; payload?: { payment?: { entity?: { id?: string; amount?: number; notes?: { userId?: string } } }; refund?: { entity?: { amount?: number; payment_id?: string } }; subscription?: { entity?: { notes?: { userId?: string } } } } };
    rows = [["Date", "Type", "Name", "Email", "Plan", "Amount (₹)", "Razorpay payment"],
      ...all.map((e) => {
        const p = e.payload as P, uid = p.userId ?? p.payload?.subscription?.entity?.notes?.userId ?? p.payload?.payment?.entity?.notes?.userId, u = who.get(uid ?? "");
        const refund = e.type === "refund.processed", paise = refund ? -(p.payload?.refund?.entity?.amount ?? 0) : p.payload?.payment?.entity?.amount ?? 0;
        return [e.createdAt, refund ? "Refund" : e.type === "order.applied" ? "One-time payment" : "Subscription", u?.name, u?.email, p.plan && p.plan in PLANS ? PLANS[p.plan as keyof typeof PLANS].name : "",
          (paise / 100).toFixed(2), p.paymentId ?? p.payload?.payment?.entity?.id ?? p.payload?.refund?.entity?.payment_id];
      })];
  } else return new Response("Ask for what=users or what=payments.", { status: 400 });
  await logAdmin(me, `Downloaded ${what} (CSV)`);
  return new Response(csv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="vasanamm-${what}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
