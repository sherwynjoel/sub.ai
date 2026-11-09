import { randomBytes } from "node:crypto";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, users } from "@/db";
import { logUse } from "@/lib/credits";
import { SITE_URL } from "@/lib/site";

/** Minutes each side gets when an invited friend buys their first pass. */
export const INVITE_MINUTES = 60;
/** Set by /r/<code> so the sign-up that follows knows who sent the visitor (30 days). */
export const REF_COOKIE = "vs_ref";
export const REF_DAYS = 30;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i: easy to read out
const newCode = () => Array.from(randomBytes(7), (b) => ALPHABET[b % ALPHABET.length]).join("");
export const cleanCode = (c: unknown) => (typeof c === "string" && /^[a-z0-9]{4,16}$/.test(c.toLowerCase()) ? c.toLowerCase() : null);

/** The user's invite code, made the first time it's asked for. */
export async function inviteCode(userId: string): Promise<string> {
  const [u] = await db.select({ code: users.referralCode }).from(users).where(eq(users.id, userId));
  if (u?.code) return u.code;
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const [set] = await db.update(users).set({ referralCode: code }).where(and(eq(users.id, userId), isNull(users.referralCode)))
      .returning({ code: users.referralCode }).catch(() => []); // taken by someone else: try another
    if (set?.code) return set.code;
    const [again] = await db.select({ code: users.referralCode }).from(users).where(eq(users.id, userId));
    if (again?.code) return again.code;
  }
  throw new Error("no invite code");
}

export const inviteLink = (code: string) => `${SITE_URL}/r/${code}`;

/** Remember who invited a new account (not themselves, not a blocked account). */
export async function rememberInvite(newUserId: string, code: unknown) {
  const c = cleanCode(code);
  if (!c) return;
  const [from] = await db.select({ id: users.id }).from(users).where(and(eq(users.referralCode, c), isNull(users.blockedAt)));
  if (!from || from.id === newUserId) return;
  await db.update(users).set({ referredBy: from.id }).where(and(eq(users.id, newUserId), isNull(users.referredBy)));
}

/** After the invited user's first paid pass: both get the invite minutes, once. */
export async function rewardInvite(userId: string) {
  const [u] = await db.update(users).set({ referralRewardedAt: new Date() })
    .where(and(eq(users.id, userId), isNotNull(users.referredBy), isNull(users.referralRewardedAt)))
    .returning({ by: users.referredBy, name: users.name });
  if (!u?.by) return;
  const [by] = await db.select({ name: users.name }).from(users).where(eq(users.id, u.by));
  const s = INVITE_MINUTES * 60;
  // Extra minutes = less usage counted (negative works as credit, and is kept when a new pass starts).
  for (const [id, detail] of [[userId, `Invited by ${by?.name ?? "a friend"}`], [u.by, `${u.name} joined with your invite`]] as const) {
    await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} - ${s}` }).where(eq(users.id, id));
    await logUse(id, -s, { kind: "bonus", video: "Invite reward", detail });
  }
}

/** How many people joined with the user's link, and how many of them have bought a pass. */
export async function inviteStats(userId: string) {
  const [r] = await db.select({
    joined: sql<number>`count(*)::int`,
    paid: sql<number>`count(${users.referralRewardedAt})::int`,
  }).from(users).where(eq(users.referredBy, userId));
  return r ?? { joined: 0, paid: 0 };
}
