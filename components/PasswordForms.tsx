"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/** Forgot password: asks for the email and sends a reset link (or says how to get one without email set up). */
export function ForgotForm() {
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: string }>({});
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ busy: true });
    const { ok, data } = await post("/api/auth/forgot", Object.fromEntries(new FormData(e.currentTarget)));
    if (!ok) return setState({ error: data.error || "Something went wrong. Try again." });
    setState({ done: data.manual
      ? `Email ${data.support} from the address you signed up with, and we'll send you a link to set a new password.`
      : "If an account uses that email, a link to set a new password is on its way. It works for one hour; check your spam folder too." });
  }
  return (
    <form className="auth" onSubmit={submit}>
      <h1>Forgot your password?</h1>
      {state.done ? <p role="status">{state.done}</p> : <>
        <p className="muted">Enter the email you signed up with.</p>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="btn" disabled={state.busy}>{state.busy ? "Please wait…" : "Send me a link"}</button>
      </>}
      <p className="muted switch"><Link href="/login">Back to sign in</Link></p>
    </form>
  );
}

/** New password, from a reset link. */
export function ResetForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("again")) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    const { ok, data } = await post("/api/auth/reset", { token, password: f.get("password") });
    if (!ok) { setBusy(false); return setError(data.error || "Something went wrong. Try again."); }
    router.replace("/app");
    router.refresh();
  }
  return (
    <form className="auth" onSubmit={submit}>
      <h1>Choose a new password</h1>
      <p className="muted">For {email}. You&apos;ll be signed out of other browsers.</p>
      <label>New password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
      <label>Type it again<input name="again" type="password" minLength={8} autoComplete="new-password" required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Please wait…" : "Save and sign in"}</button>
    </form>
  );
}
