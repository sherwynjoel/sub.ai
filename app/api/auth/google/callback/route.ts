import { randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, sessions, users } from "@/db";
import { clientIp, hashPassword, rateLimited, startSession } from "@/lib/auth";
import { googleIdentity } from "@/lib/google";
import { effectivePlan } from "@/lib/plans";
import { REF_COOKIE, rememberInvite } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";
import { EMAIL_KEY_SQL, emailKey, throwawayEmail, TRIALS_PER_IP_PER_DAY } from "@/lib/trial";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const unusablePassword = () => hashPassword(randomBytes(32).toString("base64url"));

/** The account for a Google sign-in, or the reason there isn't one. */
async function accountFor(email: string, name: string, ip: string, invite?: string) {
  const [u] = await db.select().from(users).where(sql`${sql.raw(EMAIL_KEY_SQL)} = ${emailKey(email)}`).limit(1);
  if (u) {
    // Sign-ups aren't proven to own their email, so someone could have registered this one first and be waiting. Google
    // has proved who owns it: whatever got in before Google did is shut out. Paid accounts have proved themselves.
    if (!u.emailVerifiedAt) {
      const fresh = effectivePlan(u) === "free";
      await db.update(users).set({
        emailVerifiedAt: new Date(),
        ...(fresh ? { passwordHash: await unusablePassword(), apiKeyHash: null, apiKeyHint: null } : {}),
      }).where(eq(users.id, u.id));
      if (fresh) await db.delete(sessions).where(eq(sessions.userId, u.id));
    }
    return u.id;
  }
  if (throwawayEmail(email)) return "google-email";
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users)
    .where(and(eq(users.signupIp, ip), gt(users.createdAt, new Date(Date.now() - 864e5))));
  if (ip !== "local" && n >= TRIALS_PER_IP_PER_DAY) return "google-limit";
  const [made] = await db.insert(users)
    .values({ name, email, passwordHash: await unusablePassword(), signupIp: ip, emailVerifiedAt: new Date() })
    .onConflictDoNothing().returning({ id: users.id });
  if (made) await rememberInvite(made.id, invite).catch((e) => console.error("invite", e));
  return made?.id ?? "google";
}

/** Google sends the visitor back here with a one-time code. */
export async function GET(req: Request) {
  const jar = await cookies();
  const raw = jar.get("vs_google")?.value;
  jar.delete({ name: "vs_google", path: "/api/auth/google" });
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code"), state = searchParams.get("state") ?? "", ip = clientIp(req);
  const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  let saved: { state?: string; verifier?: string; plan?: string } = {};
  try { saved = JSON.parse(raw ?? "{}"); } catch {}
  if (!code || !saved.state || !saved.verifier || !same(saved.state, state) || !clientId || !clientSecret || rateLimited(`google:${ip}`, 30)) redirect("/login?error=google");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret, code_verifier: saved.verifier,
      redirect_uri: `${SITE_URL}/api/auth/google/callback`, grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15e3),
  }).catch(() => null);
  const who = googleIdentity((await res?.json().catch(() => null))?.id_token, clientId);
  if (!who) redirect("/login?error=google");

  const account = await accountFor(who.email, who.name, ip, jar.get(REF_COOKIE)?.value);
  if (account.startsWith("google")) redirect(`/login?error=${account}`);
  const [acc] = await db.select({ blockedAt: users.blockedAt }).from(users).where(eq(users.id, account));
  if (acc?.blockedAt) redirect("/login?error=blocked");
  await startSession(account);
  redirect(saved.plan ? `/app/billing?plan=${saved.plan}` : "/app");
}
