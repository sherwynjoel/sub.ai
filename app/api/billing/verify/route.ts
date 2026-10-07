import { currentUser, json, unauthorized } from "@/lib/auth";
import { applySubscription, hmacOk, rzp } from "@/lib/razorpay";

/** Checkout success callback: verify the signature, then sync immediately (the webhook also does this). */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const ok = b.razorpay_subscription_id === u.subscriptionId &&
    hmacOk(`${b.razorpay_payment_id}|${b.razorpay_subscription_id}`, b.razorpay_signature, process.env.RAZORPAY_KEY_SECRET);
  if (!ok) return json({ error: "Payment could not be verified." }, 400);
  const sub = await rzp(`/subscriptions/${u.subscriptionId}`);
  await applySubscription({ ...sub, notes: { userId: u.id } }, sub.status === "active");
  return json({ ok: true, status: sub.status });
}
