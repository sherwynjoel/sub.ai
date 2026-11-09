import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, users } from "@/db";
import { cleanCode, inviteOffer, REF_COOKIE, REF_DAYS } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";

/** An invite link: remember a real code for the sign-up that follows, then show the homepage (with the offer if it's real). */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = cleanCode((await params).code);
  const [from] = code ? await db.select({ id: users.id }).from(users).where(and(eq(users.referralCode, code), isNull(users.blockedAt))) : [];
  if (!code || !from) return Response.redirect(`${SITE_URL}/`, 302);
  (await cookies()).set(REF_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: SITE_URL.startsWith("https"), path: "/", maxAge: REF_DAYS * 86400 });
  return Response.redirect(`${SITE_URL}/?invited=${(await inviteOffer()).friend}`, 302);
}
