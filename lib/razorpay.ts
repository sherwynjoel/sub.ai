import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { planFromRazorpayId } from "@/lib/plans";

export async function rzp(path: string, body?: unknown) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || `Razorpay ${res.status}`);
  return data;
}

export function hmacOk(payload: string, signature: string | null, secret = process.env.RAZORPAY_WEBHOOK_SECRET || "") {
  if (!signature || !secret) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(payload).digest("hex"));
  const got = Buffer.from(signature);
  return want.length === got.length && timingSafeEqual(want, got);
}

type Sub = { id: string; plan_id: string; status: string; current_end?: number | null; notes?: { userId?: string } };

/** Mirror a Razorpay subscription onto the user. `charged` = a new billing period was paid → reset usage. */
export async function applySubscription(s: Sub, charged: boolean) {
  const plan = planFromRazorpayId(s.plan_id);
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
