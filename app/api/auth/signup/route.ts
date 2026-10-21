import { db, users } from "@/db";
import { clientIp, hashPassword, json, rateLimited, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { name, email, password } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(mail)) return json({ error: "Enter your name and a valid email." }, 400);
  if (String(password ?? "").length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
  if (rateLimited(`signup:${clientIp(req)}`, 5, 3600e3)) return json({ error: "Too many sign-ups. Try later." }, 429);
  const [u] = await db
    .insert(users)
    // Never admin from a sign-up (anyone could register the admin's email first): `npm run make-admin -- <email>` on the server.
    .values({ name: name.trim(), email: mail, passwordHash: await hashPassword(password) })
    .onConflictDoNothing()
    .returning();
  if (!u) return json({ error: "An account with this email already exists." }, 409);
  await startSession(u.id);
  return json({ ok: true });
}
