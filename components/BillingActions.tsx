"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAID, PLANS, type PlanId } from "@/lib/plans";

type RazorpayCtor = new (o: Record<string, unknown>) => { open(): void; on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void };

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

type Props = {
  current: PlanId;
  live: boolean;          // a monthly subscription is running
  prepaidUntil?: string;  // a one-time payment's plan runs until this date
  subscriptions: boolean; // monthly auto-renewing subscriptions are switched on
  preselect?: string;
};

export default function BillingActions({ current, live, prepaidUntil, subscriptions, preselect }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  /** One-time payment (Standard Checkout): an order for the plan's price, then the payment is verified on the server. */
  async function payOnce(plan: PlanId) {
    setBusy(plan);
    setMsg("");
    try {
      const res = await fetch("/api/billing/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const Razorpay = await loadCheckout();
      const rzp = new Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "Vasanam",
        description: `${PLANS[plan].name} plan, 30 days`,
        prefill: { name: data.name, email: data.email },
        theme: { color: "#0a0a0a" },
        handler: async (r: Record<string, string>) => {
          setMsg("Confirming your payment…");
          const v = await fetch("/api/billing/order/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) });
          const out = await v.json().catch(() => ({}));
          setMsg(v.ok ? `You're on ${PLANS[plan].name}. Your minutes are ready.` : out.error || "Payment received; it may take a minute to show here.");
          setBusy("");
          router.refresh();
        },
        modal: { ondismiss: () => { setBusy(""); setMsg("Payment cancelled. You haven't been charged."); } },
      });
      rzp.on("payment.failed", (r) => setMsg(`Payment failed: ${r.error?.description || "try another card or UPI app"}. You haven't been charged.`));
      rzp.open();
      return; // busy until the checkout closes
    } catch (e) {
      setMsg((e as Error).message || "Couldn't start checkout.");
    }
    setBusy("");
  }

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
        theme: { color: "#0a0a0a" },
        handler: async (r: Record<string, string>) => {
          const v = await fetch("/api/billing/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) });
          setMsg(v.ok ? `You're on ${PLANS[plan].name}. Your minutes are ready.` : "Payment received; it may take a minute to show here.");
          setBusy("");
          router.refresh();
        },
        modal: { ondismiss: () => setBusy("") },
      }).open();
      return;
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
          const mine = (live || !!prepaidUntil) && current === id;
          return (
            <div key={id} className={`panel plan${preselect === id ? " picked" : ""}${mine ? " mine" : ""}`}>
              <h3>{p.name}</h3>
              <div className="amt">₹{p.priceInr.toLocaleString("en-IN")}<small> / month</small></div>
              <p className="muted">{p.minutes.toLocaleString("en-IN")} minutes a month. {p.blurb}.</p>
              {mine && <span className="current">{prepaidUntil ? `Your plan, until ${prepaidUntil}` : "Your current plan"}</span>}
              {!live && (
                <button className={`btn${preselect === id || mine ? "" : " ghost"}`} disabled={!!busy} onClick={() => payOnce(id)}>
                  {busy === id ? "Opening checkout…" : mine ? `Add 30 days · ₹${p.priceInr.toLocaleString("en-IN")}` : `Pay ₹${p.priceInr.toLocaleString("en-IN")} for 30 days`}
                </button>
              )}
              {subscriptions && !live && !mine && (
                <button className="link" disabled={!!busy} onClick={() => subscribe(id)}>or subscribe monthly (renews automatically)</button>
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
