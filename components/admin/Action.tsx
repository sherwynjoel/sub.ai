"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** A button that POSTs `body` to `url`, then refreshes the page. Optional confirm text. */
export default function Action({ url, body, label, confirm: ask, className = "btn ghost small" }: {
  url: string; body: Record<string, unknown>; label: string; confirm?: string; className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function run() {
    if (ask && !confirm(ask)) return;
    setBusy(true);
    setErr("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error || "That didn't work.");
    router.refresh();
  }
  return (
    <span className="action">
      <button className={className} onClick={run} disabled={busy}>{busy ? "Working…" : label}</button>
      {err && <span className="error small" role="alert">{err}</span>}
    </span>
  );
}
