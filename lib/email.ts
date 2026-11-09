import { getSecret } from "@/lib/secrets";
import { BUSINESS } from "@/lib/brand";
import { db, emailLog } from "@/db";

/**
 * Emails (password resets) go through Resend when its key and sender are saved, which needs a verified domain;
 * otherwise through a Gmail account with an app password, which works without a domain (about 500 a day).
 * Both are set in the server's .env.local (GMAIL_USER / GMAIL_APP_PASSWORD, or RESEND_API_KEY / EMAIL_FROM).
 */
async function gmail() {
  const [user, pass] = [(await getSecret("GMAIL_USER")) || BUSINESS.email, await getSecret("GMAIL_APP_PASSWORD")]; // the contact Gmail unless another is saved
  return user && pass ? { kind: "gmail" as const, user, pass: pass.replace(/\s+/g, "") } : null; // Google shows it in groups of 4
}
async function route() {
  const [key, from] = [await getSecret("RESEND_API_KEY"), await getSecret("EMAIL_FROM")];
  if (key && from) return { kind: "resend" as const, key, from };
  return gmail();
}

/** Whether emails can be sent. */
export async function emailReady() {
  return !!(await route());
}

/** Notes what happened to an email, for the admin's email log. Never throws. */
export async function logEmail(to: string, subject: string, result: "sent" | "no-account" | "failed", error?: string) {
  await db.insert(emailLog).values({ to, subject, result, error: error?.slice(0, 500) }).catch((e) => console.error("email log", e));
}

/** Sends one plain-text email and logs it. Throws with the service's reason when it is refused. */
export async function sendEmail(to: string, subject: string, text: string) {
  try {
    await deliver(to, subject, text);
    await logEmail(to, subject, "sent");
  } catch (e) {
    await logEmail(to, subject, "failed", String((e as Error)?.message ?? e));
    throw e;
  }
}

async function deliver(to: string, subject: string, text: string) {
  const r = await route();
  if (!r) throw new Error("Email isn't set up: set GMAIL_APP_PASSWORD (or RESEND_API_KEY) in the server's .env.local.");
  if (r.kind === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${r.key}`, "content-type": "application/json" },
      // Replies go to the contact inbox: the domain's sender address has no mailbox.
      body: JSON.stringify({ from: r.from, to: [to], subject, text, reply_to: BUSINESS.email }),
      signal: AbortSignal.timeout(15e3),
    }).catch((e) => e as Error);
    if (res instanceof Response && res.ok) return;
    const why = res instanceof Response ? `Resend refused the email (${res.status}): ${(await res.text()).slice(0, 200)}` : `Resend couldn't be reached: ${res.message}`;
    // Resend down or misconfigured: send through Gmail instead, if that is set up too.
    const g = await gmail();
    if (!g) throw new Error(why);
    console.error(why, "- sending through Gmail");
    return viaGmail(g, to, subject, text);
  }
  return viaGmail(r, to, subject, text);
}

async function viaGmail(r: { user: string; pass: string }, to: string, subject: string, text: string) {
  const { createTransport } = await import("nodemailer");
  const smtp = createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: r.user, pass: r.pass }, connectionTimeout: 15e3, greetingTimeout: 15e3, socketTimeout: 20e3 });
  try {
    await smtp.sendMail({ from: { name: "Vasanamm", address: r.user }, to, subject, text });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    throw new Error(/Invalid login|BadCredentials|535/.test(msg)
      ? "Gmail refused the login. Use an app password (myaccount.google.com/apppasswords), not the normal password."
      : `Gmail couldn't send the email: ${msg.slice(0, 200)}`);
  }
}
