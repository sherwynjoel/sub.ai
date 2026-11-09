import { cookies } from "next/headers";
import { inviterFor, REF_COOKIE, REF_DAYS } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";

/** An invite link: remember the code for the sign-up that follows (only from someone who may invite), then the homepage. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const from = await inviterFor((await params).code);
  if (!from?.referralCode) return Response.redirect(`${SITE_URL}/`, 302);
  (await cookies()).set(REF_COOKIE, from.referralCode, { httpOnly: true, sameSite: "lax", secure: SITE_URL.startsWith("https"), path: "/", maxAge: REF_DAYS * 86400 });
  return Response.redirect(`${SITE_URL}/?invited=1`, 302);
}
