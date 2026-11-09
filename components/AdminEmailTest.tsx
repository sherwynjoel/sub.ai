"use client";
import { useState } from "react";

/** Sends a test email (to the admin, or any address typed) and shows what happened. */
export default function AdminEmailTest() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [to, setTo] = useState("");
  async function send() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/test-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to }) });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: `Sent to ${data.to}. Check that inbox (and spam).` } : { ok: false, text: data.error || "It didn't work." });
    setBusy(false);
  }
  return (
    <div>
      <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Any email (empty: yours)" style={{ marginRight: 8, minWidth: 260 }} />
      <button className="btn" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send test email"}</button>
      {msg && <p className={msg.ok ? "muted" : "error"} role="status" style={{ marginTop: 10 }}>{msg.text}</p>}
    </div>
  );
}
