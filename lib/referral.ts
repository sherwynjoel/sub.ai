import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { creditLog, db, settings, users } from "@/db";
import { logUse } from "@/lib/credits";
import { SITE_URL } from "@/lib/site";

/** Set by /r/<code> so the sign-up that follows knows who sent the visitor (30 days). */
export const REF_COOKIE = "vs_ref";
export const REF_DAYS = 30;
export const INVITE_MAX = 1000;
export const INVITE_VIDEO = "Invite reward"; // the credit_log name of invite minutes

/**
 * Invites, set on Admin > Growth. Nobody gets minutes on their own: when an admin turns invites on, every user gets a
 * link; every friend who signs up with one waits in the admin's list, and minutes are only added when an admin
 * approves that friend. `upTo`: the minutes promised per approved friend ("you can get up to …"), unless the user has
 * their own amount. `message`: the line on their Billing page; {minutes} is replaced by the amount.
 */
export type InviteSettings = { on: boolean; upTo: number; message: string };
export const INVITE_MESSAGE = "You can get up to {minutes} minutes of credits for every friend who joins with your link. We check each invite, then add your minutes.";
export const INVITE_DEFAULT: InviteSettings = { on: false, upTo: 35, message: INVITE_MESSAGE };
const KEY = "invite_settings";
const mins = (v: unknown, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= INVITE_MAX ? n : d; };

export async function inviteSettings(): Promise<InviteSettings> {
  const [r] = await db.select().from(settings).where(eq(settings.key, KEY)).catch(() => []);
  if (!r) return INVITE_DEFAULT;
  try {
    const o = JSON.parse(r.value);
    return { on: !!o.on, upTo: mins(o.upTo, INVITE_DEFAULT.upTo), message: typeof o.message === "string" && o.message.trim() ? o.message.trim().slice(0, 300) : INVITE_MESSAGE };
  } catch { return INVITE_DEFAULT; }
}
export async function saveInviteSettings(o: InviteSettings) {
  const value = JSON.stringify({ on: !!o.on, upTo: mins(o.upTo, INVITE_DEFAULT.upTo), message: String(o.message ?? "").trim().slice(0, 300) });
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** The "up to" minutes for one user: their own amount if the admin set one, else the site-wide one. */
export const upToFor = (u: { inviteMinutes: number | null }, s: InviteSettings) => u.inviteMinutes ?? s.upTo;
export const inviteText = (s: InviteSettings, minutes: number) => s.message.replaceAll("{minutes}", String(minutes));

/** Whether this user may invite right now: invites on (for everyone), and the user isn't blocked. */
export const canInvite = (u: { blockedAt: Date | null }, s: InviteSettings) => s.on && !u.blockedAt;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i: easy to read out
const newCode = () => Array.from(randomBytes(7), (b) => ALPHABET[b % ALPHABET.length]).join("");
export const cleanCode = (c: unknown) => (typeof c === "string" && /^[a-z0-9]{4,16}$/.test(c.toLowerCase()) ? c.toLowerCase() : null);

/** The user's invite code, made the first time it's asked for. */
export async function inviteCode(userId: string): Promise<string> {
  const [u] = await db.select({ code: users.referralCode }).from(users).where(eq(users.id, userId));
  if (u?.code) return u.code;
  for (let i = 0; i < 5; i++) {
    const [set] = await db.update(users).set({ referralCode: newCode() }).where(and(eq(users.id, userId), isNull(users.referralCode)))
      .returning({ code: users.referralCode }).catch(() => []); // taken by someone else: try another
    if (set?.code) return set.code;
    const [again] = await db.select({ code: users.referralCode }).from(users).where(eq(users.id, userId));
    if (again?.code) return again.code;
  }
  throw new Error("no invite code");
}

export const inviteLink = (code: string) => `${SITE_URL}/r/${code}`;

/** Who a code belongs to, if they may invite right now. */
export async function inviterFor(code: unknown) {
  const c = cleanCode(code);
  if (!c) return null;
  const [from] = await db.select().from(users).where(eq(users.referralCode, c));
  return from && canInvite(from, await inviteSettings()) ? from : null;
}

/** A new account came from an invite link: note who sent them; it waits in the admin's list. No minutes yet. */
export async function rememberInvite(newUserId: string, code: unknown) {
  const from = await inviterFor(code);
  if (!from || from.id === newUserId) return;
  await db.update(users).set({ referredBy: from.id, referralStatus: "pending" }).where(and(eq(users.id, newUserId), isNull(users.referredBy)));
}

/** The invited user paid: shown to the admin when they check the invite. */
export async function noteInvitePaid(userId: string) {
  await db.update(users).set({ referralPaidAt: new Date() }).where(and(eq(users.id, userId), isNotNull(users.referredBy), isNull(users.referralPaidAt)));
}

/** Extra minutes = less usage counted (a negative count is credit, and is kept when a new pass starts). */
async function giveMinutes(userId: string, m: number, detail: string) {
  if (m <= 0) return;
  await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} - ${m * 60}` }).where(eq(users.id, userId));
  await logUse(userId, -m * 60, { kind: "bonus", video: INVITE_VIDEO, detail });
}

/**
 * The admin's decision on one invited friend. Approve: the inviter gets `inviterMin` (and the friend `friendMin`, if
 * any). Only a pending invite can be decided, once, so a double click can't pay twice. Returns the two users, or null.
 */
export async function decideInvite(friendId: string, approve: boolean, inviterMin = 0, friendMin = 0) {
  const [f] = await db.update(users).set({ referralStatus: approve ? "approved" : "rejected", referralRewardedAt: new Date() })
    .where(and(eq(users.id, friendId), eq(users.referralStatus, "pending")))
    .returning({ id: users.id, name: users.name, email: users.email, by: users.referredBy });
  if (!f?.by) return null;
  const [by] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, f.by));
  if (approve) {
    if (by) await giveMinutes(by.id, inviterMin, `${f.name} joined with your invite`);
    await giveMinutes(f.id, friendMin, `Invited by ${by?.name ?? "a friend"}`);
  }
  return { friend: f, inviter: by ?? null };
}

/** The invites waiting for an admin, oldest first, with what helps decide (paid? same connection? confirmed email?). */
export async function pendingInvites() {
  const rows = await db.select().from(users).where(eq(users.referralStatus, "pending")).orderBy(users.createdAt).limit(200);
  const ids = [...new Set(rows.map((r) => r.referredBy!))];
  const from = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
  const s = await inviteSettings();
  return rows.map((f) => {
    const by = from.find((b) => b.id === f.referredBy) ?? null;
    return { friend: f, inviter: by, upTo: by ? upToFor(by, s) : s.upTo, sameIp: !!(by?.signupIp && by.signupIp === f.signupIp) };
  });
}
export async function pendingInviteCount() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.referralStatus, "pending")).catch(() => [{ n: 0 }]);
  return r?.n ?? 0;
}

/** For the user's Billing page: how many joined, are waiting, were approved, and the invite minutes they've got. */
export async function inviteStats(userId: string) {
  const [[r], [m]] = await Promise.all([
    db.select({
      joined: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${users.referralStatus} = 'pending')::int`,
      approved: sql<number>`count(*) filter (where ${users.referralStatus} = 'approved')::int`,
    }).from(users).where(eq(users.referredBy, userId)),
    db.select({ s: sql<number>`coalesce(-sum(${creditLog.seconds}), 0)::int` }).from(creditLog).where(and(eq(creditLog.userId, userId), eq(creditLog.video, INVITE_VIDEO))),
  ]);
  return { joined: r?.joined ?? 0, pending: r?.pending ?? 0, approved: r?.approved ?? 0, earned: Math.round((m?.s ?? 0) / 60) };
}

/** The people one user invited, newest first (the admin's user page). */
export const invitedBy = (userId: string) =>
  db.select({ id: users.id, email: users.email, createdAt: users.createdAt, status: users.referralStatus, paidAt: users.referralPaidAt })
    .from(users).where(eq(users.referredBy, userId)).orderBy(desc(users.createdAt)).limit(50);

/** Invite minutes added since the user last closed the "minutes added" popup (none: nothing to show). */
export async function unseenInviteMinutes(u: { id: string; inviteSeenAt: Date | null }) {
  const rows = await db.select({ seconds: creditLog.seconds, detail: creditLog.detail }).from(creditLog)
    .where(and(eq(creditLog.userId, u.id), eq(creditLog.video, INVITE_VIDEO), sql`${creditLog.seconds} < 0`,
      u.inviteSeenAt ? sql`${creditLog.createdAt} > ${u.inviteSeenAt}` : undefined))
    .orderBy(creditLog.createdAt).limit(20).catch(() => []);
  return { minutes: Math.round(rows.reduce((a, r) => a - r.seconds, 0) / 60), reasons: rows.map((r) => r.detail).filter((d): d is string => !!d) };
}
