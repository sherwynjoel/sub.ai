import { randomBytes } from "node:crypto";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, settings, users } from "@/db";
import { logUse } from "@/lib/credits";
import { SITE_URL } from "@/lib/site";

/**
 * The invite offer, set by the admin on the Growth page: the friend gets `friend` extra minutes on top of the free
 * trial as soon as they sign up; whoever invited them gets `inviter` minutes when the friend buys their first pass
 * (paid, so made-up accounts earn nothing). 0 turns that side off.
 */
export type InviteOffer = { friend: number; inviter: number };
export const INVITE_DEFAULT: InviteOffer = { friend: 60, inviter: 60 };
export const INVITE_MAX = 1000;
const OFFER_KEY = "invite_offer";
const minutes = (v: unknown, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= INVITE_MAX ? n : d; };

export async function inviteOffer(): Promise<InviteOffer> {
  const [r] = await db.select().from(settings).where(eq(settings.key, OFFER_KEY)).catch(() => []);
  if (!r) return INVITE_DEFAULT;
  try {
    const o = JSON.parse(r.value);
    return { friend: minutes(o.friend, INVITE_DEFAULT.friend), inviter: minutes(o.inviter, INVITE_DEFAULT.inviter) };
  } catch { return INVITE_DEFAULT; }
}
export async function setInviteOffer(o: InviteOffer) {
  const value = JSON.stringify({ friend: minutes(o.friend, 0), inviter: minutes(o.inviter, 0) });
  await db.insert(settings).values({ key: OFFER_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Extra minutes = less usage counted (a negative count is credit, and is kept when a new pass starts). */
async function giveMinutes(userId: string, mins: number, detail: string) {
  if (mins <= 0) return;
  await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} - ${mins * 60}` }).where(eq(users.id, userId));
  await logUse(userId, -mins * 60, { kind: "bonus", video: "Invite reward", detail });
}
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

/** Remember who invited a new account (not themselves, not a blocked account), and give the friend their minutes. */
export async function rememberInvite(newUserId: string, code: unknown) {
  const c = cleanCode(code);
  if (!c) return;
  const [from] = await db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.referralCode, c), isNull(users.blockedAt)));
  if (!from || from.id === newUserId) return;
  const [set] = await db.update(users).set({ referredBy: from.id }).where(and(eq(users.id, newUserId), isNull(users.referredBy))).returning({ id: users.id });
  if (set) await giveMinutes(newUserId, (await inviteOffer()).friend, `Invited by ${from.name}`);
}

/** After the invited user's first paid pass: whoever invited them gets their minutes, once. */
export async function rewardInvite(userId: string) {
  const [u] = await db.update(users).set({ referralRewardedAt: new Date() })
    .where(and(eq(users.id, userId), isNotNull(users.referredBy), isNull(users.referralRewardedAt)))
    .returning({ by: users.referredBy, name: users.name });
  if (u?.by) await giveMinutes(u.by, (await inviteOffer()).inviter, `${u.name} bought a pass`);
}

/** How many people joined with the user's link, and how many of them have bought a pass. */
export async function inviteStats(userId: string) {
  const [r] = await db.select({
    joined: sql<number>`count(*)::int`,
    paid: sql<number>`count(${users.referralRewardedAt})::int`,
  }).from(users).where(eq(users.referredBy, userId));
  return r ?? { joined: 0, paid: 0 };
}
