import { cookies } from "next/headers";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { INVITE_MINUTES, REF_COOKIE } from "@/lib/referral";

export default async function Page() {
  const invited = !!(await cookies()).get(REF_COOKIE)?.value;
  return (
    <>
      {invited && <p className="invite-note">A friend invited you. When you buy your first pass, you both get {INVITE_MINUTES} free minutes.</p>}
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
