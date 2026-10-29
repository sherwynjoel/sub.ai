import { currentUser, json, unauthorized } from "@/lib/auth";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";
import { mustConfirm } from "@/lib/verify";

/** Used by the Adobe plugin to check its API key and show remaining minutes. */
export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const plan = effectivePlan(u);
  return json({ name: u.name, email: u.email, plan, planName: PLANS[plan].name, secondsLeft: secondsLeft(u), confirm: await mustConfirm(u) });
}
