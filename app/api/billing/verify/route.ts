import { billingEvents, db } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { applySubscription, hmacOk, rzp } from "@/lib/razorpay";
import { getSecret } from "@/lib/secrets";

/** Checkout success callback: verify the signature, then sync immediately (the webhook also does this). */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const ok = b.razorpay_subscription_id === u.subscriptionId &&
    hmacOk(`${b.razorpay_payment_id}|${b.razorpay_subscription_id}`, b.razorpay_signature, await getSecret("RAZORPAY_KEY_SECRET"));
  if (!ok) return json({ error: "Payment could not be verified." }, 400);
  const sub = await rzp(`/subscriptions/${u.subscriptionId}`);
  // The signed body never changes, so it can be posted again: only the first confirmation of a payment resets usage.
  const first = await db.insert(billingEvents)
    .values({ id: `checkout:${b.razorpay_payment_id}`, type: "checkout.verified", payload: { userId: u.id, subscriptionId: u.subscriptionId, paymentId: b.razorpay_payment_id } })
    .onConflictDoNothing()
    .returning();
  await applySubscription({ ...sub, notes: { userId: u.id } }, sub.status === "active" && first.length > 0);
  return json({ ok: true, status: sub.status });
}
