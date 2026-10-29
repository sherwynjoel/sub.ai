import { and, eq, gt, sql } from "drizzle-orm";
import { db, users } from "@/db";
import { clientIp, hashPassword, json, rateLimited, startSession } from "@/lib/auth";
import { emailReady } from "@/lib/email";
import { sendConfirmation } from "@/lib/verify";
import { EMAIL_KEY_SQL, emailKey, throwawayEmail, TRIALS_PER_IP_PER_DAY } from "@/lib/trial";

export async function POST(req: Request) {
  const { name, email, password } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(mail)) return json({ error: "Enter your name and a valid email." }, 400);
  if (String(password ?? "").length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
  const ip = clientIp(req);
  if (rateLimited(`signup:${ip}`, 5, 3600e3)) return json({ error: "Too many sign-ups. Try later." }, 429);
  // One free trial per person: not again with a throwaway inbox, another spelling of the same inbox
  // (Gmail dots, "+tags"), or many accounts from one connection.
  if (throwawayEmail(mail)) return json({ error: "Please use your regular email, not a temporary inbox." }, 400);
  const [same] = await db.select({ id: users.id }).from(users).where(sql`${sql.raw(EMAIL_KEY_SQL)} = ${emailKey(mail)}`).limit(1);
  if (same) return json({ error: "An account with this email already exists." }, 409);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users)
    .where(and(eq(users.signupIp, ip), gt(users.createdAt, new Date(Date.now() - 864e5))));
  if (ip !== "local" && n >= TRIALS_PER_IP_PER_DAY) return json({ error: "Too many accounts were made from this connection today. Sign in to your existing account, or try again tomorrow." }, 429);
  const [u] = await db
    .insert(users)
    // Never admin from a sign-up (anyone could register the admin's email first): `npm run make-admin -- <email>` on the server.
    .values({ name: name.trim(), email: mail, passwordHash: await hashPassword(password), signupIp: ip })
    .onConflictDoNothing()
    .returning();
  if (!u) return json({ error: "An account with this email already exists." }, 409);
  await startSession(u.id);
  if (await emailReady()) await sendConfirmation(u).catch((e) => console.error("confirm email", e)); // can be sent again from the app
  return json({ ok: true });
}
