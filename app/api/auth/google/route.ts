import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/site";

/** Sends the visitor to Google. The cookie ties the answer to this browser (state) and this request (PKCE). */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) redirect("/login?error=google");
  const plan = new URL(req.url).searchParams.get("plan") ?? "";
  const state = randomBytes(24).toString("base64url"), verifier = randomBytes(32).toString("base64url");
  (await cookies()).set("vs_google", JSON.stringify({ state, verifier, plan: /^[a-z]+$/.test(plan) ? plan : "" }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 600,
  });
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${SITE_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  })}`);
}
