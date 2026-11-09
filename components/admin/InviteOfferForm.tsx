"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** The invite offer: extra minutes for the friend at sign-up, and for the inviter when the friend first pays. */
export default function InviteOfferForm({ friend, inviter }: { friend: number; inviter: number }) {
  const router = useRouter();
  const [f, setF] = useState(String(friend)), [i, setI] = useState(String(inviter));
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "invite_offer", friend: Number(f), inviter: Number(i) }) });
    setMsg(res.ok ? "Saved." : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }
  return (
    <form className="inline-form" onSubmit={save}>
      <label>Friend gets at sign-up (min)<input type="number" min="0" max="1000" step="1" value={f} onChange={(e) => setF(e.target.value)} style={{ width: 90 }} /></label>
      <label>Inviter gets on friend&apos;s first pass (min)<input type="number" min="0" max="1000" step="1" value={i} onChange={(e) => setI(e.target.value)} style={{ width: 90 }} /></label>
      <button className="btn small">Save</button>{msg && <span className="muted small">{msg}</span>}
    </form>
  );
}
