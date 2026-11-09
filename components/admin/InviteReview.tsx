"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Approve (with the minutes to give) or reject one invited friend. */
export default function InviteReview({ friendId, upTo, inviter }: { friendId: string; upTo: number; inviter: string }) {
  const router = useRouter();
  const [a, setA] = useState(String(upTo)), [f, setF] = useState("0");
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  async function decide(approve: boolean) {
    if (approve && !confirm(`Give ${a || 0} minutes to ${inviter}${Number(f) > 0 ? ` and ${f} to the friend` : ""}?`)) return;
    if (!approve && !confirm("Reject this invite? No minutes are given.")) return;
    setBusy(true); setErr("");
    const res = await fetch("/api/admin/growth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "invite_review", friendId, approve, inviterMinutes: Number(a), friendMinutes: Number(f) }) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error || "That didn't work.");
    router.refresh();
  }
  return (
    <div className="invite-review">
      <label>Inviter<input type="number" min="0" max="1000" value={a} onChange={(e) => setA(e.target.value)} aria-label="Minutes for the inviter" /></label>
      <label>Friend<input type="number" min="0" max="1000" value={f} onChange={(e) => setF(e.target.value)} aria-label="Minutes for the friend" /></label>
      <button type="button" className="btn small" disabled={busy} onClick={() => decide(true)}>Approve</button>
      <button type="button" className="btn ghost small" disabled={busy} onClick={() => decide(false)}>Reject</button>
      {err && <span className="error small" role="alert">{err}</span>}
    </div>
  );
}
