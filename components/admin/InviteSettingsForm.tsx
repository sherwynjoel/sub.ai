"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Invites site-wide: on or off, the "up to" minutes per approved friend, and the line users see. */
export default function InviteSettingsForm({ on, upTo, message, fallback }: { on: boolean; upTo: number; message: string; fallback: string }) {
  const router = useRouter();
  const [o, setO] = useState(on), [m, setM] = useState(String(upTo)), [t, setT] = useState(message);
  const [msg, setMsg] = useState("");
  async function save(next: { on: boolean }) {
    setMsg("");
    const res = await fetch("/api/admin/site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "invite_settings", on: next.on, upTo: Number(m), message: t }) });
    setMsg(res.ok ? "Saved." : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) { setO(next.on); router.refresh(); }
  }
  return (
    <form className="invite-admin" onSubmit={(e) => { e.preventDefault(); save({ on: o }); }}>
      <div className="btn-row">
        <span className={`status ${o ? "good" : "neutral"}`}>{o ? "On" : "Off"}</span>
        <button type="button" className={o ? "btn ghost small" : "btn small"} onClick={() => save({ on: !o })}>{o ? "Turn invites off" : "Turn invites on"}</button>
      </div>
      <label>Up to (minutes per approved friend)<input type="number" min="0" max="1000" step="1" value={m} onChange={(e) => setM(e.target.value)} style={{ width: 110 }} /></label>
      <label>What users see on their Billing page <span className="muted small">({"{minutes}"} is replaced by the amount)</span>
        <textarea rows={2} maxLength={300} value={t} placeholder={fallback} onChange={(e) => setT(e.target.value)} />
      </label>
      <div className="btn-row"><button className="btn small">Save</button>{msg && <span className="muted small">{msg}</span>}</div>
    </form>
  );
}
