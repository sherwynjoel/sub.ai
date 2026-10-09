"use client";
import { useRouter } from "next/navigation";

export default function SignOut() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }
  return <button className="signout" onClick={signOut}>Sign out</button>;
}
