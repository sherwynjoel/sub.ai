"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PAID, PLANS, type PlanId } from "@/lib/plans";

const loadPass = () => import("@/components/PassReveal");
const PassReveal = dynamic(loadPass, { ssr: false });

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
  holder: string;         // the name on the pass
  passNo: string;
  until?: string;         // when the paid plan ends (ISO)
  hasPass: boolean;       // false until a new account's free minutes have started
};

export default function BillingActions({ current, live, prepaidUntil, subscriptions, preselect, holder, passNo, until, hasPass }: Props) {
  // Arrived from the editor without a page load: its isolation would block Razorpay's script.
  useEffect(() => { if (self.crossOriginIsolated) location.reload(); }, []);
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [pass, setPass] = useState<{ plan: PlanId; until?: string; fresh: boolean } | null>(null);
  const [code, setCode] = useState("");
  const [deal, setDeal] = useState<{ code: string; percent: number; prices: Record<string, number> } | null>(null);
  const [codeMsg, setCodeMsg] = useState("");

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeMsg("");
    const res = await fetch("/api/billing/coupon", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setDeal(null); return setCodeMsg(data.error || "That code isn't valid."); }
    setDeal(data);
    setCodeMsg(`${data.percent}% off applied. Pay once for 30 days to use it.`);
  }
  const price = (id: PlanId) => (deal ? deal.prices[id] : PLANS[id].priceInr);

  /** One-time payment (Standard Checkout): an order for the plan's price, then the payment is verified on the server. */
  async function payOnce(plan: PlanId) {
    setBusy(plan);
    setMsg("");
    try {
      const res = await fetch("/api/billing/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, coupon: deal?.code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const Razorpay = await loadCheckout();
      void loadPass(); // ready for the moment the payment goes through
      const rzp = new Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "Vasanamm",
        description: `${PLANS[plan].name} plan, 30 days`,
        prefill: { name: data.name, email: data.email },
        theme: { color: "#0a0a0a" },
        handler: async (r: Record<string, string>) => {
          setMsg("Confirming your payment…");
          const v = await fetch("/api/billing/order/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) });
          const out = await v.json().catch(() => ({}));
          setMsg(v.ok ? `You're on ${PLANS[plan].name}. Your minutes are ready.` : out.error || "Payment received; it may take a minute to show here.");
          if (v.ok) setPass({ plan, until: out.until, fresh: true });
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
      void loadPass(); // ready for the moment the payment goes through
      new Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Vasanamm",
        description: `${PLANS[plan].name} plan, monthly`,
        prefill: { name: data.name, email: data.email },
        theme: { color: "#0a0a0a" },
        handler: async (r: Record<string, string>) => {
          const v = await fetch("/api/billing/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) });
          const out = await v.json().catch(() => ({}));
          // A subscription can be authorised before its first charge: the minutes, and the pass, come with the charge.
          const charged = v.ok && out.status === "active";
          setMsg(charged ? `You're on ${PLANS[plan].name}. Your minutes are ready.` : "Payment received; it may take a minute to show here.");
          if (charged) setPass({ plan, until: out.until, fresh: true });
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
      {hasPass && <p className="pass-link"><button className="link" onClick={() => setPass({ plan: current, until, fresh: false })}>See your {PLANS[current].name} pass</button></p>}
      <div className="plan-grid">
        {PAID.map((id) => {
          const p = PLANS[id];
          const mine = (live || !!prepaidUntil) && current === id;
          return (
            <div key={id} className={`panel plan${preselect === id ? " picked" : ""}${mine ? " mine" : ""}`}>
              <h3>{p.name}</h3>
              <div className="amt">{deal && !live && <s className="muted">₹{p.priceInr.toLocaleString("en-IN")}</s>} ₹{price(id).toLocaleString("en-IN")}<small> / month</small></div>
              <p className="muted">{p.minutes.toLocaleString("en-IN")} minutes a month. {p.blurb}.</p>
              {mine && <span className="current">{prepaidUntil ? `Your plan, until ${prepaidUntil}` : "Your current plan"}</span>}
              {!live && (
                <button className={`btn${preselect === id || mine ? "" : " ghost"}`} disabled={!!busy} onClick={() => payOnce(id)}>
                  {busy === id ? "Opening checkout…" : mine ? `Add 30 days · ₹${price(id).toLocaleString("en-IN")}` : `Pay ₹${price(id).toLocaleString("en-IN")} for 30 days`}
                </button>
              )}
              {subscriptions && !live && !mine && (
                <button className="link" disabled={!!busy} onClick={() => subscribe(id)}>or subscribe monthly (renews automatically)</button>
              )}
            </div>
          );
        })}
      </div>
      {!live && (
        <form className="coupon-form" onSubmit={applyCode}>
          <label>Have a discount code?<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. DIWALI20" maxLength={30} /></label>
          <button className="btn ghost small" disabled={!code.trim()}>Apply</button>
          {codeMsg && <span className={deal ? "muted small" : "error small"} role="status">{codeMsg}</span>}
        </form>
      )}
      {live && (
        <p className="muted">
          To change plans, cancel your current subscription first.{" "}
          <button className="link" onClick={cancel} disabled={!!busy}>Cancel subscription</button>
        </p>
      )}
      {msg && <p role="status" className="notice">{msg}</p>}
      {pass && <PassReveal {...pass} holder={holder} passNo={passNo} onClose={() => setPass(null)} />}
    </>
  );
}
