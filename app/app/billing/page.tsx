import Link from "next/link";
import BillingActions from "@/components/BillingActions";
import { requireUser } from "@/lib/auth";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";
import { subscriptionsReady } from "@/lib/razorpay";

export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const u = await requireUser();
  const plan = effectivePlan(u);
  const total = PLANS[plan].minutes * 60;
  const left = secondsLeft(u);
  const live = ["active", "authenticated", "pending"].includes(u.subscriptionStatus ?? "");
  const date = u.periodEnd?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <h1 className="page-title">Billing</h1>
      <div className="panel usage">
        <div>
          <h2>{PLANS[plan].name} plan</h2>
          <p className="muted">
            {plan === "free"
              ? "Trial minutes are a one-time allowance."
              : u.subscriptionStatus === "prepaid"
                ? `Paid until ${date}. Pay again any time to add 30 days.`
                : u.subscriptionStatus === "cancelled"
                  ? `Cancelled. Your minutes stay available until ${date}.`
                  : `Renews on ${date}. Minutes reset each month.`}
          </p>
        </div>
        <div className="usage-meter">
          {/* Extra minutes (an admin top-up) can leave more than the plan gives. */}
          <strong>{Math.floor(left / 60)}{left <= total ? ` of ${PLANS[plan].minutes}` : ""} minutes left</strong>
          <span className="bar"><i style={{ width: `${Math.min(1, left / total) * 100}%` }} /></span>
        </div>
      </div>
      <BillingActions current={plan} live={live} subscriptions={await subscriptionsReady()} preselect={(await searchParams).plan}
        prepaidUntil={u.subscriptionStatus === "prepaid" && plan !== "free" ? date : undefined} />
      <p className="muted small">Pay for 30 days at a time by card, UPI or netbanking; nothing renews unless you choose a monthly subscription. See the <Link href="/refunds">refund and cancellation policy</Link> and <Link href="/terms">terms</Link>.</p>
    </>
  );
}
