export type PlanId = "free" | "creator" | "pro" | "studio";

export const PLANS: Record<PlanId, { name: string; priceInr: number; minutes: number; blurb: string }> = {
  free: { name: "Trial", priceInr: 0, minutes: 15, blurb: "Try it on a few clips" },
  creator: { name: "Creator", priceInr: 499, minutes: 300, blurb: "For solo editors & YouTubers" },
  pro: { name: "Pro", priceInr: 1499, minutes: 1200, blurb: "For busy freelancers" },
  studio: { name: "Studio", priceInr: 3999, minutes: 4000, blurb: "For post-production teams" },
};

export const PAID: PlanId[] = ["creator", "pro", "studio"];

type Quota = { plan: string; secondsUsed: number; periodEnd: Date | null; createdAt?: Date };

/** Every pass lasts this long; what's left of its minutes at the end expires. */
export const PASS_DAYS = 30;
/** The trial's 30 days count from sign-up, or from when passes began to expire for accounts made before. */
const TRIAL_FROM = new Date("2026-11-09T00:00:00+05:30");

/** A paid plan counts only while its period is running; otherwise the user falls back to the trial. */
export function effectivePlan(u: Quota, now = new Date()): PlanId {
  return u.plan !== "free" && u.periodEnd && u.periodEnd > now ? (u.plan as PlanId) : "free";
}

/**
 * When the user's pass ends: a paid plan's period end (past, once it has run out), the trial's 30 days. Null when it
 * can't be told (no sign-up date given).
 */
export function passEnd(u: Quota): Date | null {
  if (u.plan !== "free" && u.periodEnd) return u.periodEnd;
  if (!u.createdAt) return null;
  return new Date(Math.max(u.createdAt.getTime(), TRIAL_FROM.getTime()) + PASS_DAYS * 864e5);
}

/** The pass has ended: its unused minutes are gone (a lapsed paid plan doesn't fall back to the trial's). */
export function passExpired(u: Quota, now = new Date()) {
  const end = passEnd(u);
  return !!end && end <= now;
}

export function secondsLeft(u: Quota, now = new Date()) {
  if (passExpired(u, now)) return 0;
  return Math.max(0, PLANS[effectivePlan(u, now)].minutes * 60 - u.secondsUsed);
}

/** A date as people read it, e.g. "9 December 2026". */
export const longDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** Why nothing can be made: the pass ended (its minutes expired), or the minutes ran out. */
export function outOfMinutes(u: Quota, now = new Date()) {
  const end = passEnd(u);
  return passExpired(u, now) && end
    ? `Your pass ended on ${longDate(end)} and its unused minutes expired. Get a new pass on Billing to continue.`
    : "You've used all your minutes. Upgrade your plan to continue.";
}

/** Seconds as minutes and seconds, e.g. "12 min 5 s" ("45 s" under a minute). */
export function minSec(sec: number) {
  const s = Math.max(0, Math.ceil(sec)), m = Math.floor(s / 60), r = s % 60;
  return m ? `${m} min${r ? ` ${r} s` : ""}` : `${r} s`;
}
