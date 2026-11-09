import { cookies } from "next/headers";
import { cleanCode, inviteOffer, REF_COOKIE, REF_DAYS } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";

/** An invite link: remember the code for the sign-up that follows, then show the homepage. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = cleanCode((await params).code);
  if (code) (await cookies()).set(REF_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: SITE_URL.startsWith("https"), path: "/", maxAge: REF_DAYS * 86400 });
  return Response.redirect(`${SITE_URL}/${code ? `?invited=${(await inviteOffer()).friend}` : ""}`, 302);
}
