"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** The admins' private note on a user (never shown to the user). */
export default function UserNote({ url, note }: { url: string; note: string }) {
  const router = useRouter();
  const [text, setText] = useState(note);
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "note", note: text }) });
    setMsg(res.ok ? "Saved." : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }
  return (
    <form onSubmit={save} className="note-form">
      <textarea value={text} onChange={(e) => { setText(e.target.value); setMsg(""); }} rows={4} placeholder="e.g. Complained on WhatsApp 9 Nov, gave 10 min. Only admins see this." />
      <div className="btn-row"><button className="btn small" disabled={text === note}>Save note</button>{msg && <span className="muted small">{msg}</span>}</div>
    </form>
  );
}
