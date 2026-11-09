import { currentUser, json } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { emailReady, sendEmail } from "@/lib/email";

/** Sends a test email to the admin, answering with the exact reason when it can't be sent. */
export async function POST() {
  const u = await currentUser();
  if (!u?.isAdmin) return json({ error: "Admins only." }, 403);
  if (!(await emailReady())) return json({ error: "Email isn't set up: GMAIL_APP_PASSWORD isn't on the server." }, 400);
  try {
    await sendEmail(u.email, `${BRAND.name} test email`, `This is a test from ${BRAND.name}. Password resets and email confirmations can be sent.`);
    return json({ ok: true, to: u.email });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 502);
  }
}
