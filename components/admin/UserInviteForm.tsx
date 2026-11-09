"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Turn invites on or off for one user, and their own "up to" minutes (empty: the site-wide amount). */
export default function UserInviteForm({ url, on, minutes, siteUpTo }: { url: string; on: boolean; minutes: number | null; siteUpTo: number }) {
  const router = useRouter();
  const [m, setM] = useState(minutes == null ? "" : String(minutes));
  const [msg, setMsg] = useState("");
  async function post(body: Record<string, unknown>) {
    setMsg("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMsg(res.ok ? "Saved." : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }
  return (
    <div className="invite-admin">
      <div className="btn-row">
        <span className={`status ${on ? "good" : "neutral"}`}>{on ? "Can invite" : "Can't invite"}</span>
        <button type="button" className={on ? "btn ghost small" : "btn small"} onClick={() => post({ action: "invite_on", value: !on })}>{on ? "Turn off" : "Turn on"}</button>
      </div>
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); post({ action: "invite_minutes", minutes: m === "" ? null : Number(m) }); }}>
        <label>Up to (min)<input type="number" min="0" max="1000" value={m} placeholder={String(siteUpTo)} onChange={(e) => setM(e.target.value)} style={{ width: 90 }} /></label>
        <button className="btn small">Save</button>{msg && <span className="muted small">{msg}</span>}
      </form>
    </div>
  );
}
