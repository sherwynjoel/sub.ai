"use client";
import { useState } from "react";

/** Write one email and send it to a group (or to yourself first, as a test). */
export default function NewsForm({ groups }: { groups: { id: string; label: string; n: number }[] }) {
  const [f, setF] = useState({ group: groups[0]?.id ?? "all", subject: "", body: "Hi {name},\n\n" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const g = groups.find((x) => x.id === f.group);
  async function send(test: boolean) {
    if (!test && !confirm(`Send "${f.subject}" to ${g?.n ?? 0} people (${g?.label})? This can't be stopped once started.`)) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/growth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", test, ...f }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(!res.ok ? d.error || "That didn't work." : test ? `Test sent to ${d.to}.` : `Sending to ${d.sent} people now${d.total > d.sent ? ` (the first ${d.sent} of ${d.total}: send again tomorrow for the rest)` : ""}. Takes about ${Math.ceil(d.sent * 1.5 / 60)} min.`);
  }
  return (
    <form className="stack-form" onSubmit={(e) => e.preventDefault()}>
      <label>To<select value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}>
        {groups.map((x) => <option key={x.id} value={x.id}>{x.label} ({x.n})</option>)}
      </select></label>
      <label>Subject<input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={150} placeholder="e.g. 20% off your next pass this week" /></label>
      <label>Message <span className="muted small">({"{name}"} becomes their first name)</span><textarea rows={8} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={5000} /></label>
      <div className="btn-row">
        <button type="button" className="btn ghost small" disabled={busy || !f.subject.trim()} onClick={() => send(true)}>Send me a test</button>
        <button type="button" className="btn small" disabled={busy || !f.subject.trim() || !g?.n} onClick={() => send(false)}>Send to {g?.n ?? 0} people</button>
        {msg && <span className="muted small" role="status">{msg}</span>}
      </div>
    </form>
  );
}
