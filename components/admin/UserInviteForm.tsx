"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** One user's own "up to" minutes per approved friend (empty: the site-wide amount). */
export default function UserInviteForm({ url, minutes, siteUpTo }: { url: string; minutes: number | null; siteUpTo: number }) {
  const router = useRouter();
  const [m, setM] = useState(minutes == null ? "" : String(minutes));
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "invite_minutes", minutes: m === "" ? null : Number(m) }) });
    setMsg(res.ok ? "Saved." : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }
  return (
    <form className="inline-form" onSubmit={save}>
      <label>Their own “up to” (min)<input type="number" min="0" max="1000" value={m} placeholder={`${siteUpTo} (everyone)`} onChange={(e) => setM(e.target.value)} style={{ width: 130 }} /></label>
      <button className="btn small">Save</button>{msg && <span className="muted small">{msg}</span>}
    </form>
  );
}
