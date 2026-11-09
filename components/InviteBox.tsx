"use client";
import { useState } from "react";

/** The user's invite link, to copy or send on WhatsApp, and how many friends have joined with it. */
export default function InviteBox({ link, minutes, joined, paid }: { link: string; minutes: number; joined: number; paid: number }) {
  const [copied, setCopied] = useState(false);
  const text = `I make my video subtitles with Vasanamm: Tamil, Tanglish and 21 more Indian languages with English. Try it free: ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the field can still be selected */ }
  };
  return (
    <section className="panel invite">
      <div>
        <h2>Invite a friend, both get {minutes} minutes</h2>
        <p className="muted">Send your link. When your friend buys their first pass, you each get {minutes} free minutes. Extra minutes stay with you when a new pass starts.</p>
      </div>
      <div className="invite-row">
        <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
        <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
      </div>
      <p className="muted small">{joined === 0 ? "Nobody has joined with your link yet." : `${joined} joined with your link · ${paid} bought a pass (${paid * minutes} minutes earned)`}</p>
    </section>
  );
}
