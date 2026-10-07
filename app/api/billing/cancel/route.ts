import { currentUser, json, unauthorized } from "@/lib/auth";
import { applySubscription, rzp } from "@/lib/razorpay";

/** Cancel at the end of the current period — the user keeps their minutes until then. */
export async function POST() {
  const u = await currentUser();
  if (!u) return unauthorized();
  if (!u.subscriptionId) return json({ error: "No subscription." }, 400);
  const sub = await rzp(`/subscriptions/${u.subscriptionId}/cancel`, { cancel_at_cycle_end: 1 });
  await applySubscription({ ...sub, notes: { userId: u.id } }, false);
  return json({ ok: true, status: sub.status });
}
