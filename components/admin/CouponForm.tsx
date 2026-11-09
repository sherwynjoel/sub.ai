"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Make a discount code. */
export default function CouponForm() {
  const router = useRouter();
  const [f, setF] = useState({ code: "", percent: "20", maxUses: "", until: "" });
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/growth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "coupon_create", ...f }) });
    setMsg(res.ok ? `Code ${f.code.toUpperCase()} is ready.` : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) { setF({ code: "", percent: "20", maxUses: "", until: "" }); router.refresh(); }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="inline-form" onSubmit={save}>
      <label>Code<input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="DIWALI20" maxLength={30} required style={{ width: 140 }} /></label>
      <label>% off<input type="number" min={1} max={90} value={f.percent} onChange={set("percent")} required style={{ width: 80 }} /></label>
      <label>Max uses (optional)<input type="number" min={1} value={f.maxUses} onChange={set("maxUses")} placeholder="No limit" style={{ width: 110 }} /></label>
      <label>Ends (optional)<input type="date" value={f.until} onChange={set("until")} /></label>
      <button className="btn small">Make code</button>
      {msg && <span className="muted small">{msg}</span>}
    </form>
  );
}
