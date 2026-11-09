import Link from "next/link";
import AiCostForm from "@/components/admin/AiCostForm";
import { inr, when } from "@/lib/admin";
import { money } from "@/lib/money";

const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/** Money in and out: by month and day, by plan, refunds, failed and unfinished payments, and the AI's share. */
export default async function Revenue() {
  const m = await money();
  const thisMonth = m.months.at(-1)!, lastMonth = m.months.at(-2)!;
  const total12 = m.months.reduce((a, r) => a + r.income - r.refunds, 0);
  const maxDay = Math.max(1, ...m.days.map((d) => d.r));

  return (
    <>
      <h1>Revenue</h1>
      <p className="btn-row"><a className="btn ghost small" href="/api/admin/export?what=payments">Download payments (CSV)</a> <a className="btn ghost small" href="/api/admin/export?what=users">Download users (CSV)</a></p>
      <dl className="stats">
        <div className="stat"><dt>This month</dt><dd>{inr(thisMonth.income - thisMonth.refunds)}</dd><span className="sub">{thisMonth.payments} payments{thisMonth.refunds ? `, ${inr(thisMonth.refunds)} refunded` : ""}</span></div>
        <div className="stat"><dt>Last month</dt><dd>{inr(lastMonth.income - lastMonth.refunds)}</dd><span className="sub">{lastMonth.payments} payments</span></div>
        <div className="stat"><dt>Last 12 months</dt><dd>{inr(total12)}</dd><span className="sub">After refunds</span></div>
        <div className="stat"><dt>AI cost, this month</dt><dd>{m.cost ? inr(thisMonth.aiCost) : "—"}</dd><span className="sub">{Math.round(thisMonth.minutes)} min made{m.cost ? ` × ₹${m.cost}` : ""}</span></div>
        <div className="stat"><dt>Profit, this month</dt><dd>{m.cost ? inr(thisMonth.profit) : "—"}</dd><span className="sub">{m.cost ? "Income − refunds − AI cost" : "Set the AI cost below"}</span></div>
      </dl>

      <section className="panel">
        <h2>Last 30 days</h2>
        <div className="day-bars" role="img" aria-label="Money in each day of the last 30 days">
          {m.days.map((d) => <span key={d.d} title={`${d.d}: ${inr(d.r)}`} style={{ height: `${Math.max(2, (d.r / maxDay) * 100)}%` }} className={d.r ? "" : "zero"} />)}
        </div>
        <p className="muted small">Each bar is one day. Highest day: {inr(maxDay === 1 && !m.days.some((d) => d.r) ? 0 : maxDay)}.</p>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>By month</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Month</th><th className="num">Income</th><th className="num">Refunds</th><th className="num">Minutes made</th><th className="num">AI cost</th><th className="num">Profit</th></tr></thead>
            <tbody>{[...m.months].reverse().map((r) => (
              <tr key={r.m}><td>{monthName(r.m)}</td><td className="num">{inr(r.income)}</td><td className="num">{r.refunds ? inr(r.refunds) : "—"}</td><td className="num">{Math.round(r.minutes)}</td>
                <td className="num">{m.cost ? inr(r.aiCost) : "—"}</td><td className="num">{m.cost ? inr(r.profit) : "—"}</td></tr>
            ))}</tbody>
          </table></div>
        </section>
        <section className="panel">
          <h2>By plan (12 months)</h2>
          {m.byPlan.length === 0 ? <p className="muted">No payments yet.</p> : (
            <table><tbody>{m.byPlan.map(([plan, v]) => <tr key={plan}><td>{plan}</td><td className="num">{v.n} payments</td><td className="num">{inr(v.rupees)}</td></tr>)}</tbody></table>
          )}
          <h2 className="spaced">AI cost per minute</h2>
          <p className="muted small">What one minute of video costs you in AI fees (Gemini, Sarvam…), in ₹. Check your AI bill and divide by the minutes made that month. Used for the profit figures.</p>
          <AiCostForm cost={m.cost} />
        </section>
      </div>

      <section className="panel">
        <h2>Payments that failed (30 days)</h2>
        <p className="muted small">The bank or UPI refused the payment. Worth a message: they wanted to pay.</p>
        {m.failed.length === 0 ? <p className="muted">None. (Razorpay sends these only if the webhook has the payment.failed event turned on.)</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>When</th><th>Who</th><th>Phone</th><th className="num">Amount</th><th>Why</th></tr></thead>
            <tbody>{m.failed.map((f, i) => (
              <tr key={i}><td>{when(f.at)}</td><td>{f.user ? <Link href={`/admin/users/${f.user.id}`}>{f.user.email}</Link> : f.email ?? "—"}</td><td>{f.phone ?? "—"}</td><td className="num">{inr(f.rupees)}</td><td>{f.why}{f.method ? <span className="muted"> · {f.method}</span> : null}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <h2>Payments started but not finished (30 days)</h2>
        <p className="muted small">They opened the payment window but never paid. A reminder or a small discount often brings them back.</p>
        {m.unfinished.length === 0 ? <p className="muted">None.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>When</th><th>Who</th><th>Plan</th><th className="num">Amount</th></tr></thead>
            <tbody>{m.unfinished.map((f, i) => (
              <tr key={i}><td>{when(f.at)}</td><td>{f.user ? <Link href={`/admin/users/${f.user.id}`}>{f.user.email}</Link> : "—"}</td><td>{f.plan}</td><td className="num">{inr(f.rupees)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Latest payments</h2>
          {m.recent.length === 0 ? <p className="muted">None yet.</p> : (
            <table><tbody>{m.recent.map((r, i) => (
              <tr key={i}><td>{when(r.at)}</td><td>{r.user ? <Link href={`/admin/users/${r.user.id}`}>{r.user.email}</Link> : "—"}</td><td className="num">{inr(r.rupees)}</td></tr>
            ))}</tbody></table>
          )}
        </section>
        <section className="panel">
          <h2>Refunds</h2>
          {m.refunds.length === 0 ? <p className="muted">None.</p> : (
            <table><tbody>{m.refunds.map((r, i) => <tr key={i}><td>{when(r.at)}</td><td className="muted small">{r.payment}</td><td className="num">{inr(r.rupees)}</td></tr>)}</tbody></table>
          )}
          <p className="muted small spaced">Refunds are made in the Razorpay dashboard; they show here once Razorpay tells us (refund.processed webhook event).</p>
        </section>
      </div>
    </>
  );
}
