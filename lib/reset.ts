import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, passwordResets, sessions, users } from "@/db";
import { hashPassword, sha256 } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";

/** A one-time link that lets the user choose a new password (emailed, or made by an admin to send by hand). */
export async function resetLink(userId: string, hours = 1) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({ tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + hours * 3600e3) });
  return `${SITE_URL}/reset?token=${token}`;
}

/** The user a reset token belongs to, while it's unused and not expired. */
export async function resetUser(token: string) {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const [row] = await db.select({ userId: passwordResets.userId, email: users.email }).from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())));
  return row ?? null;
}

/** Sets the new password, uses up every open reset link and signs the account out everywhere. */
export async function completeReset(userId: string, password: string) {
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)));
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
