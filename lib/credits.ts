import { and, eq, sql } from "drizzle-orm";
import { db, users } from "@/db";
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

/** Give back what a run that failed was charged. */
export async function refund(userId: string, seconds: number) {
  await db.update(users).set({ secondsUsed: sql`greatest(0, ${users.secondsUsed} - ${Math.ceil(seconds)})` }).where(eq(users.id, userId));
}
