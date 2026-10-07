import { db, users } from "@/db";
import { hashPassword, json, rateLimited, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { name, email, password } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(mail)) return json({ error: "Enter your name and a valid email." }, 400);
  if (String(password ?? "").length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
  if (rateLimited(`signup:${req.headers.get("x-forwarded-for") ?? "local"}`, 5, 3600e3)) return json({ error: "Too many sign-ups. Try later." }, 429);
  const [u] = await db
    .insert(users)
    .values({ name: name.trim(), email: mail, passwordHash: await hashPassword(password), isAdmin: mail === process.env.ADMIN_EMAIL?.toLowerCase() })
    .onConflictDoNothing()
    .returning();
  if (!u) return json({ error: "An account with this email already exists." }, 409);
  await startSession(u.id);
  return json({ ok: true });
}
