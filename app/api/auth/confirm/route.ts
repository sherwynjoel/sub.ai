import { clientIp, currentUser, json, rateLimited, unauthorized } from "@/lib/auth";
import { confirmEmail, mustConfirm, sendConfirmation } from "@/lib/verify";
import { SITE_URL } from "@/lib/site";

/** The link in the confirmation email: confirms it, then opens the projects page. */
export async function GET(req: Request) {
  if (rateLimited(`confirm-ip:${clientIp(req)}`, 30)) return new Response("Too many attempts. Try again in 15 minutes.", { status: 429 });
  const ok = await confirmEmail(new URL(req.url).searchParams.get("token") ?? "");
  return Response.redirect(`${SITE_URL}/app?confirmed=${ok ? 1 : 0}`, 303);
}

/** Send the confirmation email again. */
export async function POST() {
  const u = await currentUser();
  if (!u) return unauthorized();
  if (!(await mustConfirm(u))) return json({ ok: true, already: true });
  if (rateLimited(`confirm-send:${u.id}`, 3, 3600e3)) return json({ error: "We've sent a few already. Check your spam folder, or try again in an hour." }, 429);
  const sent = await sendConfirmation(u).then(() => true, (e) => (console.error("confirm email", e), false));
  return sent ? json({ ok: true }) : json({ error: "Couldn't send the email just now. Try again in a few minutes." }, 502);
}
