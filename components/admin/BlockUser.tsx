"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Block an account (signed out at once, can't sign in or use the plugin), or unblock it. */
export default function BlockUser({ url, email, blocked }: { url: string; email: string; blocked: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  async function run(action: "block" | "unblock") {
    if (action === "block" && !confirm(`Block ${email}? They are signed out now and can't sign in until you unblock them.`)) return;
    setErr("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason }) });
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error || "That didn't work.");
    router.refresh();
  }
  return blocked ? (
    <div className="btn-row"><button className="btn small" onClick={() => run("unblock")}>Unblock</button>{err && <span className="error small">{err}</span>}</div>
  ) : (
    <div className="inline-form">
      <label>Reason (only admins see it)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fake trial accounts" maxLength={200} style={{ minWidth: 220 }} /></label>
      <button className="btn danger small" onClick={() => run("block")}>Block account</button>
      {err && <span className="error small">{err}</span>}
    </div>
  );
}
