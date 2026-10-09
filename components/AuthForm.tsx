"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const plan = useSearchParams().get("plan");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(data.error || "Something went wrong. Try again.");
    }
    router.replace(plan ? `/app/billing?plan=${plan}` : "/app");
    router.refresh();
  }

  const signup = mode === "signup";
  return (
    <form className="auth" onSubmit={submit}>
      <h1>{signup ? "Create your account" : "Welcome back"}</h1>
      <p className="muted">{signup ? "Your first 15 minutes of subtitles are free." : "Sign in to your projects."}</p>
      {signup && <label>Name<input name="name" autoComplete="name" required /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>
        Password
        <input name="password" type="password" minLength={signup ? 8 : undefined} autoComplete={signup ? "new-password" : "current-password"} required />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
      <p className="muted switch">
        {signup ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>New here? <Link href={`/signup${plan ? `?plan=${plan}` : ""}`}>Create an account</Link></>}
      </p>
    </form>
  );
}
