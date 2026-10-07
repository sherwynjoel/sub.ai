import BillingActions from "@/components/BillingActions";
import { requireUser } from "@/lib/auth";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";

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
              : u.subscriptionStatus === "cancelled"
                ? `Cancelled. Your minutes stay available until ${date}.`
                : `Renews on ${date}. Minutes reset each month.`}
          </p>
        </div>
        <div className="usage-meter">
          <strong>{Math.floor(left / 60)} of {PLANS[plan].minutes} minutes left</strong>
          <span className="bar"><i style={{ width: `${(left / total) * 100}%` }} /></span>
        </div>
      </div>
      <BillingActions current={plan} live={live} preselect={(await searchParams).plan} />
    </>
  );
}
