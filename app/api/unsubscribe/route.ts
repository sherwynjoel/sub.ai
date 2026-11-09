import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { BRAND } from "@/lib/brand";
import { unsubOk } from "@/lib/news";

/** The link at the bottom of emails sent to groups: no more of them (password and account emails still come). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams, u = q.get("u") ?? "", s = q.get("s") ?? "";
  const ok = /^[0-9a-f-]{36}$/.test(u) && unsubOk(u, s);
  if (ok) await db.update(users).set({ noNews: true }).where(eq(users.id, u));
  const msg = ok ? `You won't get news emails from ${BRAND.name} any more. Emails about your account (like password resets) still come.` : "This link doesn't work. Write to us and we'll take you off the list.";
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${BRAND.name}</title><body style="font-family:system-ui;max-width:520px;margin:15vh auto;padding:0 20px;line-height:1.5"><h1 style="font-size:1.4rem">${ok ? "Unsubscribed" : "Something's wrong"}</h1><p>${msg}</p><p><a href="/">${BRAND.name}</a></p></body>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
