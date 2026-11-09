"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

/** Pops up once after an admin approves an invite: how many minutes were added, and why. */
export default function InviteReward({ minutes, reasons }: { minutes: number; reasons: string[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  const seen = () => { fetch("/api/me/invite-seen", { method: "POST" }).catch(() => {}); };
  const close = () => ref.current?.close();
  return (
    <dialog ref={ref} className="invite-reward" aria-labelledby="ir-title" onClose={seen}>
      <span className="ir-mins" aria-hidden="true">+{minutes}<small>min</small></span>
      <h2 id="ir-title">{minutes} free minute{minutes === 1 ? "" : "s"} added to your account</h2>
      <p className="muted">Thanks for inviting {reasons.length > 1 ? "friends" : "a friend"} to Vasanamm.</p>
      {reasons.length > 0 && <ul>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      <p className="muted small">They&apos;re in your minutes left now, and stay with you when a new pass starts.</p>
      <div className="modal-actions">
        <Link href="/app/usage" className="btn ghost" onClick={close}>See history</Link>
        <button type="button" className="btn" onClick={close} autoFocus>Great</button>
      </div>
    </dialog>
  );
}
