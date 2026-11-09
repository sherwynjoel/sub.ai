"use client";
import { useState } from "react";

/** Sends every admin a test alert, to check alerts reach them. */
export default function AlertTest() {
  const [msg, setMsg] = useState("");
  async function send() {
    setMsg("Sending…");
    const res = await fetch("/api/admin/site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "test_alert" }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Sent to ${d.n} admin${d.n === 1 ? "" : "s"}. Check the inbox (and spam).` : d.error || "That didn't work.");
  }
  return <div className="btn-row spaced"><button className="btn ghost small" onClick={send}>Send a test alert</button>{msg && <span className="muted small">{msg}</span>}</div>;
}
