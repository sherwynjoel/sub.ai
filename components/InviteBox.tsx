"use client";
import { useState } from "react";

/** The user's invite link, to copy or send on WhatsApp, and what has come of it. Minutes are added after an admin checks. */
export default function InviteBox({ link, minutes, text, stats }: {
  link: string; minutes: number; text: string; stats: { joined: number; pending: number; approved: number; earned: number };
}) {
  const [copied, setCopied] = useState(false);
  const share = `I make my video subtitles with Vasanamm: Tamil, Tanglish and 21 more Indian languages with English. Try it free: ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the field can still be selected */ }
  };
  return (
    <section className="panel invite">
      <div>
        <h2>Invite friends, get up to {minutes} minutes each</h2>
        <p className="muted">{text}</p>
      </div>
      <div className="invite-row">
        <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
        <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
      </div>
      <p className="muted small">
        {stats.joined === 0 ? "Nobody has joined with your link yet."
          : `${stats.joined} joined with your link · ${stats.pending} being checked · ${stats.approved} approved${stats.earned ? ` · ${stats.earned} minutes added` : ""}`}
      </p>
    </section>
  );
}
