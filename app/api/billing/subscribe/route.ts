import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { PAID, type PlanId } from "@/lib/plans";
import { razorpayPlanId, rzp } from "@/lib/razorpay";
import { getSecret } from "@/lib/secrets";

const LIVE = ["active", "authenticated", "pending"];

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: PlanId };
  const planId = plan && PAID.includes(plan) ? await razorpayPlanId(plan) : "";
  if (!planId) return json({ error: "This plan isn't available yet." }, 400);
  // ponytail: no mid-cycle plan switching; cancel then resubscribe. Add Razorpay subscription update when users ask.
  if (u.subscriptionStatus && LIVE.includes(u.subscriptionStatus))
    return json({ error: "You already have an active subscription. Cancel it first to switch plans." }, 409);
  const sub = await rzp("/subscriptions", {
    plan_id: planId,
    total_count: 120, // monthly for up to 10 years; user can cancel anytime
    customer_notify: 1,
    notes: { userId: u.id },
  });
  await db.update(users).set({ subscriptionId: sub.id, subscriptionStatus: sub.status }).where(eq(users.id, u.id));
  return json({ subscriptionId: sub.id, keyId: await getSecret("RAZORPAY_KEY_ID"), name: u.name, email: u.email });
}
