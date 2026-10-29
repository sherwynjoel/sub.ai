import { currentUser, json, unauthorized } from "@/lib/auth";
import { PAID, PLANS, type PlanId } from "@/lib/plans";
import { PREPAID_DAYS, rzp } from "@/lib/razorpay";
import { getSecret } from "@/lib/secrets";

const LIVE = ["active", "authenticated", "pending"];

/**
 * One-time payment for a plan (Razorpay Standard Checkout): creates the order for the plan's price, worked out here
 * (never from the browser). The checkout opens with it; api/billing/order/verify applies the payment.
 */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: PlanId };
  if (!plan || !PAID.includes(plan)) return json({ error: "Pick a plan." }, 400);
  if (u.subscriptionStatus && LIVE.includes(u.subscriptionStatus))
    return json({ error: "You have a monthly subscription running. Cancel it first to pay once instead." }, 409);
  const keyId = await getSecret("RAZORPAY_KEY_ID");
  if (!keyId) return json({ error: "Payments aren't set up yet." }, 503);
  const amount = PLANS[plan].priceInr * 100; // paise
  try {
    const order = await rzp("/orders", {
      amount, currency: "INR",
      receipt: `${plan}-${u.id.slice(0, 8)}-${Date.now().toString(36)}`, // ≤ 40 characters
      notes: { userId: u.id, plan, days: String(PREPAID_DAYS) },
    });
    return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId, name: u.name, email: u.email });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("razorpay order", msg);
    if (/auth/i.test(msg)) return json({ error: "Payments are misconfigured (the Razorpay keys were refused)." }, 401);
    return json({ error: "Couldn't start the payment. Try again in a minute." }, 500);
  }
}
