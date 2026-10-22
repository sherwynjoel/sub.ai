import { clientIp, json, rateLimited, startSession } from "@/lib/auth";
import { completeReset, resetUser } from "@/lib/reset";

/** Sets a new password from a reset link, then signs the user in (and out of every other browser). */
export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (rateLimited(`reset-ip:${clientIp(req)}`, 20)) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const pw = String(password ?? "");
  if (pw.length < 8) return json({ error: "Use at least 8 characters." }, 400);
  const u = await resetUser(String(token ?? ""));
  if (!u) return json({ error: "This link has expired or was already used. Ask for a new one." }, 400);
  await completeReset(u.userId, pw);
  await startSession(u.userId);
  return json({ ok: true });
}
