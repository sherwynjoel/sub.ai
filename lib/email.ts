import "server-only";
import { getSecret } from "@/lib/secrets";

/** Whether emails can be sent (a Resend key and a sender are saved in /admin → Connections). */
export async function emailReady() {
  return !!(await getSecret("RESEND_API_KEY")) && !!(await getSecret("EMAIL_FROM"));
}

/** Sends one email through Resend. Throws with Resend's reason when it is refused. */
export async function sendEmail(to: string, subject: string, text: string) {
  const [key, from] = [await getSecret("RESEND_API_KEY"), await getSecret("EMAIL_FROM")];
  if (!key || !from) throw new Error("Email isn't set up: add the Resend key and sender in Connections.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(15e3),
  });
  if (!res.ok) throw new Error(`Resend refused the email (${res.status}): ${(await res.text()).slice(0, 200)}`);
}
