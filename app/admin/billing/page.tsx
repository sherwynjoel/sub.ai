import Link from "next/link";
import { desc, isNotNull, sql } from "drizzle-orm";
import { billingEvents, db, users } from "@/db";
import { inr, overview, when } from "@/lib/admin";
import { effectivePlan, PAID, PLANS } from "@/lib/plans";

const STATUS: Record<string, string> = {
  active: "good", authenticated: "wait", pending: "wait", created: "neutral", halted: "bad", cancelled: "neutral", completed: "neutral", paused: "wait",
};

type Evt = { payload?: { subscription?: { entity?: { id?: string } }; payment?: { entity?: { amount?: number; method?: string } } } };

export default async function Subscriptions() {
  const [o, subs, events, [counts]] = await Promise.all([
    overview(),
    db.select().from(users).where(isNotNull(users.subscriptionId)).orderBy(desc(users.periodEnd)).limit(200),
    db.select().from(billingEvents).orderBy(desc(billingEvents.createdAt)).limit(50),
    db.select({
      active: sql<number>`(count(*) filter (where ${users.subscriptionStatus} = 'active'))::int`,
      cancelled: sql<number>`(count(*) filter (where ${users.subscriptionStatus} = 'cancelled'))::int`,
      halted: sql<number>`(count(*) filter (where ${users.subscriptionStatus} = 'halted'))::int`,
    }).from(users),
  ]);
  const owner = new Map(subs.map((u) => [u.subscriptionId!, u]));

  return (
    <>
      <h1>Subscriptions</h1>
      <dl className="stats">
        <div className="stat"><dt>Monthly recurring revenue</dt><dd>{inr(o.mrr)}</dd><span className="sub">Active subscriptions at list price</span></div>
        <div className="stat"><dt>Collected, 30 days</dt><dd>{inr(o.revenue30d)}</dd><span className="sub">{o.charges30d} charges</span></div>
        <div className="stat"><dt>Active</dt><dd>{counts.active}</dd><span className="sub">{PAID.map((p) => `${PLANS[p].name} ${o.byPlan[p] ?? 0}`).join(", ")}</span></div>
        <div className="stat"><dt>Cancelled</dt><dd>{counts.cancelled}</dd><span className="sub">Keep access until period ends</span></div>
        <div className="stat"><dt>Payment failed</dt><dd>{counts.halted}</dd><span className="sub">Razorpay stopped retrying</span></div>
      </dl>

      <section className="panel">
        <h2>Subscribers</h2>
        {subs.length === 0 ? <p className="muted">No one has subscribed yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Renews / ends</th><th>Razorpay</th></tr></thead>
              <tbody>{subs.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}`}>{u.name}</Link><span className="muted">{u.email}</span></td>
                  <td>{PLANS[effectivePlan(u)].name}</td>
                  <td><span className={`status ${STATUS[u.subscriptionStatus ?? ""] ?? "neutral"}`}>{u.subscriptionStatus}</span></td>
                  <td>{when(u.periodEnd)}</td>
                  <td><a href={`https://dashboard.razorpay.com/app/subscriptions/${u.subscriptionId}`} target="_blank" rel="noreferrer">{u.subscriptionId}</a></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Payment events</h2>
        <p className="muted">Everything Razorpay has told us through the webhook, newest first.</p>
        {events.length === 0 ? <p className="muted">No webhook events received yet. Check the webhook in Connections.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>User</th><th className="num">Amount</th><th>Method</th><th>Received</th></tr></thead>
              <tbody>{events.map((e) => {
                const p = (e.payload as Evt).payload;
                const u = owner.get(p?.subscription?.entity?.id ?? "");
                const paise = p?.payment?.entity?.amount;
                return (
                  <tr key={e.id}>
                    <td>{e.type}</td>
                    <td>{u ? <Link href={`/admin/users/${u.id}`}>{u.email}</Link> : <span className="muted">{p?.subscription?.entity?.id ?? "—"}</span>}</td>
                    <td className="num">{paise ? inr(paise / 100) : "—"}</td>
                    <td>{p?.payment?.entity?.method ?? "—"}</td>
                    <td>{when(e.createdAt)}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
