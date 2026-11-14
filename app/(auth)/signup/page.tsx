import { cookies } from "next/headers";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { REF_COOKIE } from "@/lib/referral";

export default async function Page() {
  const invited = !!(await cookies()).get(REF_COOKIE)?.value;
  return (
    <>
      {invited && <p className="invite-note">A friend invited you. Sign up to get started.</p>}
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
