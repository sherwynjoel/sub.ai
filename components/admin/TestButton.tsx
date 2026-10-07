"use client";
import { useState } from "react";

export default function TestButton({ service, label }: { service: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/connections/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ service }) });
    const data = await res.json().catch(() => ({ ok: false, message: "No answer from the server." }));
    setResult({ ok: !!data.ok, message: data.message || data.error });
    setBusy(false);
  }

  return (
    <span className="action">
      <button className="btn ghost small" onClick={run} disabled={busy}>{busy ? "Testing…" : label}</button>
      {result && <span className={`result status ${result.ok ? "good" : "bad"}`} role="status">{result.message}</span>}
    </span>
  );
}
