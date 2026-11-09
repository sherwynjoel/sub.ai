import { clientIp, json, rateLimited, startSession, verifyPassword } from "@/lib/auth";
import { userByEmail } from "@/lib/findUser";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  // Per account and address, so nobody can lock someone else out; plus a cap per address for trying many accounts.
  const ip = clientIp(req);
  if (rateLimited(`login:${mail}:${ip}`) || rateLimited(`login-ip:${ip}`, 50)) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const u = await userByEmail(mail);
  if (!u || !(await verifyPassword(String(password ?? ""), u.passwordHash))) return json({ error: "Wrong email or password." }, 401);
  await startSession(u.id);
  return json({ ok: true });
}
