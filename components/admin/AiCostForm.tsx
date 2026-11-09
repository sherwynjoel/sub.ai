"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Save what one minute of subtitling costs in AI fees (₹). */
export default function AiCostForm({ cost }: { cost: number }) {
  const router = useRouter();
  const [v, setV] = useState(cost ? String(cost) : "");
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ai_cost", rupees: Number(v) }) });
    setMsg(res.ok ? "Saved." : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }
  return (
    <form className="inline-form" onSubmit={save}>
      <label>₹ per minute<input type="number" step="0.01" min="0" value={v} onChange={(e) => setV(e.target.value)} placeholder="e.g. 0.50" style={{ width: 110 }} /></label>
      <button className="btn small">Save</button>{msg && <span className="muted small">{msg}</span>}
    </form>
  );
}
