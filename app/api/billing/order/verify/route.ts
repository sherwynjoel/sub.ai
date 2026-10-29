import { currentUser, json, unauthorized } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { applyOrderPayment, hmacOk } from "@/lib/razorpay";
import { getSecret } from "@/lib/secrets";

/**
 * Checkout success callback for a one-time payment: the signature must be HMAC-SHA256(order_id|payment_id) with the
 * key secret; then the order and payment are checked with Razorpay itself before the plan is given (once).
 */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const order = b.razorpay_order_id, payment = b.razorpay_payment_id, signature = b.razorpay_signature;
  if (typeof order !== "string" || typeof payment !== "string" || typeof signature !== "string" || !order || !payment || !signature)
    return json({ error: "Missing payment details." }, 400);
  if (!hmacOk(`${order}|${payment}`, signature, await getSecret("RAZORPAY_KEY_SECRET")))
    return json({ error: "Payment could not be verified." }, 400);
  try {
    const plan = await applyOrderPayment(order, payment);
    if (!plan) return json({ error: "This payment doesn't match the order. If money was taken, contact us and we'll sort it out." }, 400);
    return json({ ok: true, plan, planName: PLANS[plan].name });
  } catch (e) {
    console.error("razorpay verify", (e as Error).message);
    return json({ error: "Payment received, but we couldn't confirm it just now. It will show within a few minutes." }, 502);
  }
}
