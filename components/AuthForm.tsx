"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't work. Try again, or use your email and password.",
  "google-email": "Please use your regular email, not a temporary inbox.",
  blocked: "This account has been blocked. If you think that's a mistake, write to vasanam2026@gmail.com.",
  "google-limit": "Too many accounts were made from this connection today. Sign in to your existing account, or try again tomorrow.",
};

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan");
  const [error, setError] = useState(GOOGLE_ERRORS[params.get("error") ?? ""] ?? "");
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
      <p className="muted">{signup ? "Create your account, then pick a plan." : "Sign in to your projects."}</p>
      <a className="google-btn" href={`/api/auth/google${plan ? `?plan=${plan}` : ""}`}>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.8-6.8C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.7 7.1-17.1z" />
          <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
        </svg>
        Continue with Google
      </a>
      <p className="auth-or"><span>or</span></p>
      {signup && <label>Name<input name="name" autoComplete="name" required /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>
        Password
        <input name="password" type="password" minLength={signup ? 8 : undefined} autoComplete={signup ? "new-password" : "current-password"} required />
      </label>
      {!signup && <p className="small forgot"><Link href="/forgot">Forgot password?</Link></p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
      {signup && <p className="muted small">By creating an account you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.</p>}
      <p className="muted switch">
        {signup ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>New here? <Link href={`/signup${plan ? `?plan=${plan}` : ""}`}>Create an account</Link></>}
      </p>
    </form>
  );
}
