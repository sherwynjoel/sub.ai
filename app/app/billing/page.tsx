import Link from "next/link";
import BillingActions from "@/components/BillingActions";
import { requireUser } from "@/lib/auth";
import { type PlanId, effectivePlan, longDate, minSec, passEnd, passExpired, PLANS, secondsLeft } from "@/lib/plans";
import { subscriptionsReady } from "@/lib/razorpay";
import { mustConfirm } from "@/lib/verify";

export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const u = await requireUser();
  const plan = effectivePlan(u);
  const total = PLANS[plan].minutes * 60;
  const left = secondsLeft(u);
  const live = ["active", "authenticated", "pending"].includes(u.subscriptionStatus ?? "");
  const date = u.periodEnd ? longDate(u.periodEnd) : undefined;
  const end = passEnd(u), ended = passExpired(u), endDate = end ? longDate(end) : "";

  return (
    <>
      <h1 className="page-title">Billing</h1>
      <div className="panel usage">
        <div>
          <h2>{ended && u.plan in PLANS ? `${PLANS[u.plan as PlanId].name} pass ended` : `${PLANS[plan].name} plan`}</h2>
          <p className="muted">
            {ended
              ? `Your pass ended on ${endDate}. Its unused minutes expired. Pick a plan below for a new pass.`
              : plan === "free"
                ? `Trial: use your minutes by ${endDate}. Unused minutes expire then.`
                : u.subscriptionStatus === "prepaid"
                  ? `Paid until ${date}. Unused minutes expire then. Paying again adds 30 days with fresh minutes.`
                  : u.subscriptionStatus === "cancelled"
                    ? `Cancelled. Use your minutes by ${date}; unused minutes expire then.`
                    : `Renews on ${date}. Minutes reset each month; unused ones expire.`}
          </p>
        </div>
        <div className="usage-meter">
          {/* Extra minutes (an admin top-up) can leave more than the plan gives. */}
          <strong>{minSec(left)}{left <= total && !ended ? ` of ${PLANS[plan].minutes} min` : ""} left</strong>
          {!ended && endDate && <span className="muted small">Expires {endDate}</span>}
          <span className="bar"><i style={{ width: `${Math.min(1, left / total) * 100}%` }} /></span>
        </div>
      </div>
      <BillingActions current={plan} live={live} subscriptions={await subscriptionsReady()} preselect={(await searchParams).plan}
        holder={u.name} passNo={u.id.slice(0, 8).toUpperCase()} until={end?.toISOString()} hasPass={!(await mustConfirm(u))}
        prepaidUntil={u.subscriptionStatus === "prepaid" && plan !== "free" ? date : undefined} />
      <p className="muted small">Pay for 30 days at a time by card, UPI or netbanking; nothing renews unless you choose a monthly subscription. See the <Link href="/refunds">refund and cancellation policy</Link> and <Link href="/terms">terms</Link>.</p>
    </>
  );
}
