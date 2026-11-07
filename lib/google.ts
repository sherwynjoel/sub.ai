/** Who Google says signed in, from the ID token of the token exchange. It came straight from Google over TLS, so the
 * claims are checked but the signature needn't be (OpenID Connect Core 3.1.3.7). Null unless the email is confirmed. */
export function googleIdentity(idToken: unknown, clientId: string, now = Date.now()) {
  try {
    const c = JSON.parse(Buffer.from(String(idToken).split(".")[1], "base64url").toString());
    if (!["https://accounts.google.com", "accounts.google.com"].includes(c.iss)) return null;
    if (c.aud !== clientId || !(c.exp * 1000 > now) || c.email_verified !== true) return null;
    const email = String(c.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return null;
    return { email, name: String(c.name ?? "").trim() || email.split("@")[0] };
  } catch {
    return null;
  }
}
