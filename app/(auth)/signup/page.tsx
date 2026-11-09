import { cookies } from "next/headers";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { inviteOffer, REF_COOKIE } from "@/lib/referral";

export default async function Page() {
  const invited = !!(await cookies()).get(REF_COOKIE)?.value, { friend } = await inviteOffer();
  return (
    <>
      {invited && <p className="invite-note">A friend invited you. {friend > 0 ? `Sign up and get the free trial plus ${friend} extra minutes.` : "Sign up to start your free trial."}</p>}
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
