import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, emailChecks, users } from "@/db";
import { sha256 } from "@/lib/auth";
import { BRAND, BUSINESS } from "@/lib/brand";
import { emailReady, sendEmail } from "@/lib/email";
import { effectivePlan } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";

/**
 * Free minutes start once the email is confirmed (one trial per real inbox). Only while emails can be sent: without
 * an email service nobody could confirm, so nobody is asked. Paid plans never need it.
 */
export async function mustConfirm(u: { emailVerifiedAt: Date | null; plan: string; periodEnd: Date | null; secondsUsed: number }) {
  return !u.emailVerifiedAt && effectivePlan(u) === "free" && (await emailReady());
}

/** Emails a one-time confirmation link (valid 2 days). */
export async function sendConfirmation(u: { id: string; name: string; email: string }) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailChecks).values({ tokenHash: sha256(token), userId: u.id, expiresAt: new Date(Date.now() + 48 * 3600e3) });
  const link = `${SITE_URL}/api/auth/confirm?token=${token}`;
  await sendEmail(u.email, `Confirm your email for ${BRAND.name}`,
    `Hi ${u.name},\n\nWelcome to ${BRAND.name}! Confirm your email to start your free minutes:\n\n${link}\n\nThe link works for 2 days. If you didn't sign up, ignore this email.\n\n${BRAND.name}\n${BUSINESS.email}`);
}

/** Confirms the email a link was sent for; the user's id, or null if the link is unknown or expired. */
export async function confirmEmail(token: string) {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const [row] = await db.delete(emailChecks).where(and(eq(emailChecks.tokenHash, sha256(token)), gt(emailChecks.expiresAt, new Date()))).returning({ userId: emailChecks.userId });
  if (!row) return null;
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
  await db.delete(emailChecks).where(eq(emailChecks.userId, row.userId)); // the other links sent
  return row.userId;
}
