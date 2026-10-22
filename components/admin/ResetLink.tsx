"use client";
import { useState } from "react";
import CopyText from "@/components/admin/CopyText";

/** Makes a one-day password reset link for a user, to send by hand while email isn't set up. */
export default function ResetLink({ url, email }: { url: string; email: string }) {
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  async function make() {
    if (!confirm(`Make a password reset link for ${email}? Anyone with the link can set a new password for this account for 24 hours.`)) return;
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reset_link" }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data.error || "That didn't work.");
    setLink(data.link);
  }
  return link ? (
    <div className="reset-link">
      <p className="muted small">Send this to {email} only. It works once, for 24 hours.</p>
      <CopyText text={link} />
    </div>
  ) : (
    <span className="action">
      <button className="btn ghost small" onClick={make}>Password reset link</button>
      {err && <span className="error small" role="alert">{err}</span>}
    </span>
  );
}
