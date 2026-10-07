import "server-only";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db, sessions, users } from "@/db";

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const COOKIE = "vs_session";
const SESSION_DAYS = 30;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(pw, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const got = await scrypt(pw, salt, 64);
  return timingSafeEqual(got, Buffer.from(hash, "hex"));
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

/** Current user from the session cookie (website) or `Authorization: Bearer <api key>` (Adobe plugin). */
export async function currentUser() {
  const bearer = (await headers()).get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (bearer) {
    const [u] = await db.select().from(users).where(eq(users.apiKeyHash, sha256(bearer)));
    return u ?? null;
  }
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())));
  return row?.user ?? null;
}

export type User = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export function newApiKey() {
  const key = "vsn_" + randomBytes(24).toString("base64url");
  return { key, hash: sha256(key), hint: key.slice(0, 8) + "…" + key.slice(-4) };
}

// ponytail: in-memory limiter, per process; move to Postgres/Redis when running several web instances.
const attempts = new Map<string, { n: number; until: number }>();
export function rateLimited(key: string, max = 10, windowMs = 15 * 60e3) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) return attempts.set(key, { n: 1, until: now + windowMs }), false;
  return ++a.n > max;
}

/** JSON helpers for route handlers. */
export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const unauthorized = () => json({ error: "Please sign in." }, 401);
