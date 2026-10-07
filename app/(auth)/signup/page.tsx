import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
