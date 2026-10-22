import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { clientIp, json, rateLimited } from "@/lib/auth";
import { BRAND, BUSINESS } from "@/lib/brand";
import { emailReady, sendEmail } from "@/lib/email";
import { resetLink } from "@/lib/reset";

/**
 * Emails a reset link. The answer is the same whether or not the address has an account, so nobody can find out who
 * has one. Without an email service it says to write to support (an admin can make a link on the user's page).
 */
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(mail)) return json({ error: "Enter the email address you signed up with." }, 400);
  const ip = clientIp(req);
  if (rateLimited(`forgot:${mail}`, 3, 60 * 60e3) || rateLimited(`forgot-ip:${ip}`, 10, 60 * 60e3)) return json({ error: "Too many requests. Try again in an hour." }, 429);
  if (!(await emailReady())) return json({ ok: true, manual: true, support: BUSINESS.email });
  const [u] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, mail));
  if (u) {
    const link = await resetLink(u.id);
    await sendEmail(mail, `Reset your ${BRAND.name} password`,
      `Hi ${u.name},\n\nSomeone (hopefully you) asked to reset the password for your ${BRAND.name} account. Choose a new password here:\n\n${link}\n\nThe link works once, for the next hour. If you didn't ask for this, ignore this email: your password stays the same.\n\n${BRAND.name}\n${BUSINESS.email}`,
    ).catch((e) => console.error("reset email", e));
  }
  return json({ ok: true });
}
