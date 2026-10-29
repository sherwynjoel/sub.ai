import "server-only";
import { getSecret } from "@/lib/secrets";
import { BUSINESS } from "@/lib/brand";

/**
 * Emails (password resets) go through Resend when its key and sender are saved, which needs a verified domain;
 * otherwise through a Gmail account with an app password, which works without a domain (about 500 a day).
 * Both are set in the server's .env.local (GMAIL_USER / GMAIL_APP_PASSWORD, or RESEND_API_KEY / EMAIL_FROM).
 */
async function route() {
  const [key, from] = [await getSecret("RESEND_API_KEY"), await getSecret("EMAIL_FROM")];
  if (key && from) return { kind: "resend" as const, key, from };
  const [user, pass] = [(await getSecret("GMAIL_USER")) || BUSINESS.email, await getSecret("GMAIL_APP_PASSWORD")]; // the contact Gmail unless another is saved
  if (user && pass) return { kind: "gmail" as const, user, pass: pass.replace(/\s+/g, "") }; // Google shows it in groups of 4
  return null;
}

/** Whether emails can be sent. */
export async function emailReady() {
  return !!(await route());
}

/** Sends one plain-text email. Throws with the service's reason when it is refused. */
export async function sendEmail(to: string, subject: string, text: string) {
  const r = await route();
  if (!r) throw new Error("Email isn't set up: set GMAIL_APP_PASSWORD (or RESEND_API_KEY) in the server's .env.local.");
  if (r.kind === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${r.key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: r.from, to: [to], subject, text }),
      signal: AbortSignal.timeout(15e3),
    });
    if (!res.ok) throw new Error(`Resend refused the email (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const { createTransport } = await import("nodemailer");
  const smtp = createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: r.user, pass: r.pass }, connectionTimeout: 15e3, greetingTimeout: 15e3, socketTimeout: 20e3 });
  try {
    await smtp.sendMail({ from: { name: "Vasanam", address: r.user }, to, subject, text });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    throw new Error(/Invalid login|BadCredentials|535/.test(msg)
      ? "Gmail refused the login. Use an app password (myaccount.google.com/apppasswords), not the normal password."
      : `Gmail couldn't send the email: ${msg.slice(0, 200)}`);
  }
}
