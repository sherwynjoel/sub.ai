export type PlanId = "free" | "creator" | "pro" | "studio";

export const PLANS: Record<PlanId, { name: string; priceInr: number; minutes: number; blurb: string }> = {
  free: { name: "Trial", priceInr: 0, minutes: 15, blurb: "Try it on a few clips" },
  creator: { name: "Creator", priceInr: 499, minutes: 300, blurb: "For solo editors & YouTubers" },
  pro: { name: "Pro", priceInr: 1499, minutes: 1200, blurb: "For busy freelancers" },
  studio: { name: "Studio", priceInr: 3999, minutes: 4000, blurb: "For post-production teams" },
};

export const PAID: PlanId[] = ["creator", "pro", "studio"];

type Quota = { plan: string; secondsUsed: number; periodEnd: Date | null };

/** A paid plan counts only while its period is running; otherwise the user falls back to the trial. */
export function effectivePlan(u: Quota, now = new Date()): PlanId {
  return u.plan !== "free" && u.periodEnd && u.periodEnd > now ? (u.plan as PlanId) : "free";
}

export function secondsLeft(u: Quota, now = new Date()) {
  return Math.max(0, PLANS[effectivePlan(u, now)].minutes * 60 - u.secondsUsed);
}

/** Seconds as minutes and seconds, e.g. "12 min 5 s" ("45 s" under a minute). */
export function minSec(sec: number) {
  const s = Math.max(0, Math.ceil(sec)), m = Math.floor(s / 60), r = s % 60;
  return m ? `${m} min${r ? ` ${r} s` : ""}` : `${r} s`;
}
