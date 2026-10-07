"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";

/** Give a plan for N days, or add bonus minutes. */
export default function UserPlanForm({ url }: { url: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId>("pro");
  const [days, setDays] = useState("30");
  const [minutes, setMinutes] = useState("60");
  const [msg, setMsg] = useState("");

  async function post(body: Record<string, unknown>, done: string) {
    setMsg("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMsg(res.ok ? done : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="plan-form">
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); post({ action: "set_plan", plan, days: Number(days) }, `Plan changed to ${PLANS[plan].name}.`); }}>
        <label>Plan
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
            {(Object.keys(PLANS) as PlanId[]).map((p) => <option key={p} value={p}>{PLANS[p].name}</option>)}
          </select>
        </label>
        {plan !== "free" && <label>For days<input type="number" min={1} max={3660} value={days} onChange={(e) => setDays(e.target.value)} style={{ width: 90 }} /></label>}
        <button className="btn small">Set plan</button>
      </form>
      <form className="inline-form spaced" onSubmit={(e) => { e.preventDefault(); post({ action: "add_minutes", minutes: Number(minutes) }, `Added ${minutes} bonus minutes.`); }}>
        <label>Bonus minutes<input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: 110 }} /></label>
        <button className="btn ghost small">Add minutes</button>
      </form>
      {msg && <p className="notice spaced" role="status">{msg}</p>}
    </div>
  );
}
