/**
 * Guards on the free trial (one per person): sign-ups compare emails by the inbox they reach, refuse throwaway
 * inboxes, and only so many trials start from one connection a day (api/auth/signup).
 */

/** Gmail ignores dots and anything after "+" (and googlemail.com is gmail.com); most providers ignore "+tags". */
export function emailKey(email: string) {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  const base = local.split("+")[0];
  return domain === "gmail.com" || domain === "googlemail.com" ? `${base.replace(/\./g, "")}@gmail.com` : `${base}@${domain}`;
}

/** The same rule in SQL, for comparing with the emails already saved. */
export const EMAIL_KEY_SQL = `(case when split_part(email, '@', 2) in ('gmail.com', 'googlemail.com')
  then replace(split_part(split_part(email, '@', 1), '+', 1), '.', '') || '@gmail.com'
  else split_part(split_part(email, '@', 1), '+', 1) || '@' || split_part(email, '@', 2) end)`;

/** Free trials a single connection can start in a day (homes and offices share one; so do some mobile networks). */
export const TRIALS_PER_IP_PER_DAY = 3;

// Throwaway inbox services (the common ones; their sub-domains too).
const THROWAWAY = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "sharklasers.com",
  "grr.la", "pokemail.net", "spam4.me", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io",
  "tempmail.net", "tempmailo.com", "tempr.email", "tmpmail.org", "tmpmail.net", "yopmail.com", "yopmail.net", "yopmail.fr",
  "throwawaymail.com", "trashmail.com", "trashmail.de", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
  "mailnesia.com", "mintemail.com", "mohmal.com", "emailondeck.com", "fakeinbox.com", "fakemail.net", "spamgourmet.com",
  "mailcatch.com", "moakt.com", "mail.tm", "mail.gw", "inboxkitten.com", "burnermail.io", "33mail.com", "anonaddy.me",
  "mytemp.email", "tempinbox.com", "discard.email", "emailfake.com", "generator.email", "1secmail.com", "1secmail.net",
  "1secmail.org", "byom.de", "harakirimail.com", "mailpoof.com", "crazymailing.com", "luxusmail.org", "minuteinbox.com",
  "dropmail.me", "10mail.org", "emltmp.com", "spambox.us", "trbvm.com", "linshiyouxiang.net", "tempmail.plus", "mailto.plus",
  "fexpost.com", "fexbox.org", "rover.info", "chitthi.in", "inbox.lv-temp.com", "zetmail.com", "vomoto.com", "tmail.ws",
]);

export function throwawayEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  for (let d = domain; d.includes("."); d = d.slice(d.indexOf(".") + 1)) if (THROWAWAY.has(d)) return true;
  return false;
}
