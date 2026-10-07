"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { name: string; label: string; help: string; secret: boolean; source: "admin" | "env" | null; display: string };

export default function ConnectionRow({ name, label, help, secret, source, display }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(v: string) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, value: v }) });
    setBusy(false);
    if (!res.ok) return setMsg((await res.json().catch(() => ({}))).error || "Couldn't save.");
    setValue("");
    setMsg(v ? "Saved" : "Cleared");
    router.refresh();
  }

  const id = `conn-${name}`;
  return (
    <div className="conn">
      <div className="conn-head">
        <label htmlFor={id}><strong>{label}</strong></label>
        <span className={`status ${source ? "good" : "neutral"}`}>{source === "admin" ? "Saved here" : source === "env" ? "From .env file" : "Not set"}</span>
      </div>
      <span className="muted small">{help}</span>
      {display && <span className="now">Current: {display}</span>}
      <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) save(value.trim()); }}>
        <input id={id} type={secret ? "password" : "text"} value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={source ? "Paste a new value to replace it" : "Paste the value"} autoComplete="off" spellCheck={false} />
        <button className="btn small" disabled={busy || !value.trim()}>Save</button>
        {source === "admin" && (
          <button type="button" className="btn ghost small" disabled={busy} onClick={() => confirm(`Clear ${label}?`) && save("")}>Clear</button>
        )}
      </form>
      {msg && <span className="small muted" role="status">{msg}</span>}
    </div>
  );
}
