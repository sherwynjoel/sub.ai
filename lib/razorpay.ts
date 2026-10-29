import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { billingEvents, db, users } from "@/db";
import { effectivePlan, PAID, PLANS, type PlanId } from "@/lib/plans";
import { getSecret, type ConnectionName } from "@/lib/secrets";

export async function rzp(path: string, body?: unknown) {
  const [id, secret] = await Promise.all([getSecret("RAZORPAY_KEY_ID"), getSecret("RAZORPAY_KEY_SECRET")]);
  if (!id || !secret) throw new Error("Payments aren't set up yet. Add the Razorpay keys in Admin → Connections.");
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || `Razorpay ${res.status}`);
  return data;
}

export function hmacOk(payload: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(payload).digest("hex"));
  const got = Buffer.from(signature);
  return want.length === got.length && timingSafeEqual(want, got);
}

type Sub = { id: string; plan_id: string; status: string; current_end?: number | null; notes?: { userId?: string } };

export const razorpayPlanId = (plan: PlanId) => getSecret(`RAZORPAY_PLAN_${plan.toUpperCase()}` as ConnectionName);

export async function planFromRazorpayId(id: string): Promise<PlanId | null> {
  for (const p of PAID) if ((await razorpayPlanId(p)) === id) return p;
  return null;
}

/** Mirror a Razorpay subscription onto the user. `charged` = a new billing period was paid → reset usage. */
export async function applySubscription(s: Sub, charged: boolean) {
  const plan = await planFromRazorpayId(s.plan_id);
  const where = s.notes?.userId ? eq(users.id, s.notes.userId) : eq(users.subscriptionId, s.id);
  await db
    .update(users)
    .set({
      subscriptionId: s.id,
      subscriptionStatus: s.status,
      ...(plan && s.current_end ? { plan, periodEnd: new Date(s.current_end * 1000) } : {}),
      ...(charged ? { secondsUsed: 0 } : {}),
    })
    .where(where);
}

/** Monthly auto-renewing subscriptions need Razorpay Subscriptions on the account and all three plan IDs saved. */
export async function subscriptionsReady() {
  for (const p of PAID) if (!(await razorpayPlanId(p))) return false;
  return true;
}

/** One paid plan period bought with a one-time payment (Standard Checkout). */
export const PREPAID_DAYS = 30;

type Order = { id: string; amount: number; currency: string; status: string; notes?: { userId?: string; plan?: string } };
type Payment = { id: string; order_id: string; amount: number; currency: string; status: string };

/**
 * A one-time payment for an order (from the checkout callback or the order.paid webhook, whichever comes first):
 * checked against what Razorpay says about the order and payment, then applied once. Gives the plan's minutes,
 * fresh, for PREPAID_DAYS; paying again for the same plan while it runs adds PREPAID_DAYS to its end.
 * Returns the plan, or null when the payment doesn't pay for this order in full.
 */
export async function applyOrderPayment(orderId: string, paymentId: string): Promise<PlanId | null> {
  const order: Order = await rzp(`/orders/${orderId}`);
  let pay: Payment = await rzp(`/payments/${paymentId}`);
  const plan = order.notes?.plan as PlanId | undefined, userId = order.notes?.userId;
  if (!plan || !PAID.includes(plan) || !userId || pay.order_id !== order.id) return null;
  if (order.amount !== PLANS[plan].priceInr * 100 || order.currency !== "INR" || pay.amount !== order.amount) return null;
  // Accounts set to capture by hand leave a payment "authorized": capture it, or the money goes back after a few days.
  if (pay.status === "authorized") pay = await rzp(`/payments/${paymentId}/capture`, { amount: pay.amount, currency: pay.currency });
  if (pay.status !== "captured") return null;
  // Shaped like a subscription.charged event so revenue adds up the same way (lib/admin.ts chargedRupees).
  const first = await db.insert(billingEvents).values({ id: `order:${order.id}`, type: "order.applied", payload: { userId, plan, orderId: order.id, paymentId, payload: { payment: { entity: { amount: pay.amount } } } } })
    .onConflictDoNothing().returning();
  if (!first.length) return plan; // already applied
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return null;
  const now = new Date(), running = effectivePlan(u, now) === plan && u.periodEnd && u.periodEnd > now ? u.periodEnd : now;
  await db.update(users).set({ plan, periodEnd: new Date(running.getTime() + PREPAID_DAYS * 864e5), secondsUsed: 0, subscriptionStatus: "prepaid" })
    .where(eq(users.id, userId));
  return plan;
}
