import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { json, rateLimited, startSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  if (rateLimited(`login:${mail}`)) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const [u] = await db.select().from(users).where(eq(users.email, mail));
  if (!u || !(await verifyPassword(String(password ?? ""), u.passwordHash))) return json({ error: "Wrong email or password." }, 401);
  await startSession(u.id);
  return json({ ok: true });
}
