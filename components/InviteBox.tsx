"use client";
import { useState } from "react";

/** The user's invite link, to copy or send on WhatsApp, and how many friends have joined with it. */
export default function InviteBox({ link, offer, joined, paid }: { link: string; offer: { friend: number; inviter: number }; joined: number; paid: number }) {
  const [copied, setCopied] = useState(false);
  const text = `I make my video subtitles with Vasanamm: Tamil, Tanglish and 21 more Indian languages with English. Try it free${offer.friend > 0 ? `, with ${offer.friend} extra minutes` : ""}: ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the field can still be selected */ }
  };
  return (
    <section className="panel invite">
      <div>
        <h2>{offer.inviter > 0 ? `Invite a friend, get ${offer.inviter} minutes` : "Invite a friend"}</h2>
        <p className="muted">
          Send your link.{offer.friend > 0 && ` Your friend gets the free trial plus ${offer.friend} extra minutes when they sign up.`}
          {offer.inviter > 0 && ` When they buy their first pass, you get ${offer.inviter} free minutes.`} Extra minutes stay with you when a new pass starts.
        </p>
      </div>
      <div className="invite-row">
        <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
        <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
      </div>
      <p className="muted small">{joined === 0 ? "Nobody has joined with your link yet." : `${joined} joined with your link · ${paid} bought a pass`}</p>
    </section>
  );
}
