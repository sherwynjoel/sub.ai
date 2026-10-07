"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAID, PLANS, type PlanId } from "@/lib/plans";

type RazorpayCtor = new (o: Record<string, unknown>) => { open(): void };

function loadCheckout() {
  return new Promise<RazorpayCtor>((resolve, reject) => {
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (w.Razorpay) return resolve(w.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(w.Razorpay!);
    s.onerror = () => reject(new Error("Couldn't load Razorpay. Check your connection."));
    document.body.append(s);
  });
}

export default function BillingActions({ current, live, preselect }: { current: PlanId; live: boolean; preselect?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function subscribe(plan: PlanId) {
    setBusy(plan);
    setMsg("");
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const Razorpay = await loadCheckout();
      new Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Vasanam",
        description: `${PLANS[plan].name} plan, monthly`,
        prefill: { name: data.name, email: data.email },
        theme: { color: "#8b5cf6" },
        handler: async (r: Record<string, string>) => {
          const v = await fetch("/api/billing/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) });
          setMsg(v.ok ? `You're on ${PLANS[plan].name}. Your minutes are ready.` : "Payment received; it may take a minute to show here.");
          router.refresh();
        },
        modal: { ondismiss: () => setBusy("") },
      }).open();
    } catch (e) {
      setMsg((e as Error).message || "Couldn't start checkout.");
    }
    setBusy("");
  }

  async function cancel() {
    if (!confirm("Cancel your subscription? You keep your plan until the end of this billing month.")) return;
    setBusy("cancel");
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    setBusy("");
    setMsg(res.ok ? "Subscription cancelled. Your plan stays active until the renewal date." : "Couldn't cancel. Try again.");
    router.refresh();
  }

  return (
    <>
      <div className="plan-grid">
        {PAID.map((id) => {
          const p = PLANS[id];
          const mine = live && current === id;
          return (
            <div key={id} className={`panel plan${preselect === id ? " picked" : ""}${mine ? " mine" : ""}`}>
              <h3>{p.name}</h3>
              <div className="amt">₹{p.priceInr.toLocaleString("en-IN")}<small> / month</small></div>
              <p className="muted">{p.minutes.toLocaleString("en-IN")} minutes a month. {p.blurb}.</p>
              {mine ? (
                <span className="current">Your current plan</span>
              ) : (
                <button className={`btn${preselect === id ? "" : " ghost"}`} disabled={live || !!busy} onClick={() => subscribe(id)}>
                  {busy === id ? "Opening checkout…" : `Subscribe to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {live && (
        <p className="muted">
          To change plans, cancel your current subscription first.{" "}
          <button className="link" onClick={cancel} disabled={!!busy}>Cancel subscription</button>
        </p>
      )}
      {msg && <p role="status" className="notice">{msg}</p>}
    </>
  );
}
