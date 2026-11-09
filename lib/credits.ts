import { and, eq, sql } from "drizzle-orm";
import { creditLog, db, users } from "@/db";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";

type Payer = { id: string; plan: string; periodEnd: Date | null; secondsUsed: number; createdAt?: Date };

/**
 * Take `seconds` from the user's minutes, all at once and only if they're there (two requests at the same moment
 * can't spend more than the plan has), and never from a pass that has ended. True when taken.
 */
export async function charge(u: Payer, seconds: number) {
  const secs = Math.ceil(seconds), quota = PLANS[effectivePlan(u)].minutes * 60;
  if (secondsLeft(u) < secs) return false;
  const done = await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} + ${secs}` })
    .where(and(eq(users.id, u.id), sql`${users.secondsUsed} + ${secs} <= ${quota}`)).returning({ id: users.id });
  return done.length > 0;
}

/** Give back what a run that failed was charged (noted in the history as given back). */
export async function refund(userId: string, seconds: number, use: Use) {
  await db.update(users).set({ secondsUsed: sql`greatest(0, ${users.secondsUsed} - ${Math.ceil(seconds)})` }).where(eq(users.id, userId));
  await logUse(userId, -seconds, use);
}

export type Use = { jobId?: string | null; video: string; kind: "upload" | "translate" | "remake" | "extra" | "refund"; detail?: string };

/** Note a use of minutes in the user's history (Usage page). Never in the way: a failure to note it is only logged. */
export async function logUse(userId: string, seconds: number, use: Use) {
  await db.insert(creditLog).values({ userId, seconds: Math.ceil(seconds), jobId: use.jobId ?? null, video: use.video, kind: use.kind, detail: use.detail ?? null })
    .catch((e) => console.error("credit log", e));
}
