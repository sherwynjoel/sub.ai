import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { PAID, type PlanId } from "@/lib/plans";
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
