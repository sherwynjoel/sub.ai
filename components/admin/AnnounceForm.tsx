"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Announcement } from "@/lib/news";

/** Set or remove the announcement bar. */
export default function AnnounceForm({ current }: { current: Announcement | null }) {
  const router = useRouter();
  const [f, setF] = useState({ text: current?.text ?? "", link: current?.link ?? "", linkText: current?.linkText ?? "", until: current?.until ? current.until.slice(0, 10) : "" });
  const [msg, setMsg] = useState("");
  async function post(body: Record<string, unknown>, done: string) {
    const res = await fetch("/api/admin/growth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMsg(res.ok ? done : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="stack-form" onSubmit={(e) => { e.preventDefault(); post({ action: "announce", ...f }, "Shown to everyone now."); }}>
      <label>Message<input value={f.text} onChange={set("text")} maxLength={200} placeholder="e.g. New: Hindi and Telugu subtitles are here" required /></label>
      <div className="inline-form">
        <label>Link (optional)<input value={f.link} onChange={set("link")} placeholder="/app/billing or https://…" /></label>
        <label>Link text<input value={f.linkText} onChange={set("linkText")} placeholder="See plans" maxLength={40} /></label>
        <label>Show until (optional)<input type="date" value={f.until} onChange={set("until")} /></label>
      </div>
      <div className="btn-row">
        <button className="btn small">{current ? "Update" : "Show it"}</button>
        {current && <button type="button" className="btn ghost small" onClick={() => post({ action: "clear_announce" }, "Removed.")}>Remove</button>}
        {msg && <span className="muted small">{msg}</span>}
      </div>
    </form>
  );
}
