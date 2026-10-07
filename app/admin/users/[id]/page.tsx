import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import Action from "@/components/admin/Action";
import UserPlanForm from "@/components/admin/UserPlanForm";
import { billingEvents, db, jobs, users } from "@/db";
import { mins, requireAdmin, when } from "@/lib/admin";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) notFound();
  const [projects, events] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.userId, u.id)).orderBy(desc(jobs.createdAt)).limit(20),
    u.subscriptionId
      ? db.select().from(billingEvents).where(sql`${billingEvents.payload}->'payload'->'subscription'->'entity'->>'id' = ${u.subscriptionId}`).orderBy(desc(billingEvents.createdAt)).limit(20)
      : Promise.resolve([]),
  ]);
  const plan = effectivePlan(u);
  const url = `/api/admin/users/${u.id}`;

  return (
    <>
      <p><Link href="/admin/users" className="muted">Users</Link></p>
      <h1>{u.name}</h1>
      <div className="two-col">
        <section className="panel">
          <h2>Account</h2>
          <dl className="kv">
            <dt>Email</dt><dd>{u.email}</dd>
            <dt>Joined</dt><dd>{when(u.createdAt)}</dd>
            <dt>Plan</dt><dd>{PLANS[plan].name}{u.plan !== plan ? ` (was ${PLANS[u.plan as keyof typeof PLANS]?.name ?? u.plan}, expired)` : ""}</dd>
            <dt>Period ends</dt><dd>{when(u.periodEnd)}</dd>
            <dt>Minutes used</dt><dd>{mins(Math.max(0, u.secondsUsed))} of {PLANS[plan].minutes.toLocaleString("en-IN")} min</dd>
            <dt>Minutes left</dt><dd>{mins(secondsLeft(u))}</dd>
            <dt>Plugin key</dt><dd>{u.apiKeyHint ?? "None created"}</dd>
            <dt>Admin</dt><dd>{u.isAdmin ? "Yes" : "No"}</dd>
          </dl>
        </section>
        <section className="panel">
          <h2>Subscription</h2>
          {u.subscriptionId ? (
            <dl className="kv">
              <dt>Status</dt><dd>{u.subscriptionStatus}</dd>
              <dt>Razorpay ID</dt>
              <dd><a href={`https://dashboard.razorpay.com/app/subscriptions/${u.subscriptionId}`} target="_blank" rel="noreferrer">{u.subscriptionId}</a></dd>
            </dl>
          ) : (
            <p className="muted">Never subscribed.</p>
          )}
          <h2 className="spaced">Change access</h2>
          <UserPlanForm url={url} />
          <div className="btn-row spaced">
            <Action url={url} body={{ action: "reset_usage" }} label="Reset minutes used" confirm={`Reset ${u.email}'s used minutes to 0?`} />
            <Action url={url} body={{ action: "sign_out" }} label="Sign out everywhere" confirm={`Sign ${u.email} out of every browser?`} />
            {u.id !== me.id && (
              <Action url={url} body={{ action: "set_admin", value: !u.isAdmin }} label={u.isAdmin ? "Remove admin" : "Make admin"}
                confirm={u.isAdmin ? `Remove admin access from ${u.email}?` : `Give ${u.email} full admin access, including API keys?`} />
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Projects</h2>
        {projects.length === 0 ? <p className="muted">No projects yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th className="num">Length</th><th>Status</th><th>Uploaded</th></tr></thead>
              <tbody>{projects.map((j) => (
                <tr key={j.id}><td>{j.filename}</td><td className="num">{mins(j.durationSec)}</td><td>{j.status}{j.error ? ` — ${j.error.slice(0, 80)}` : ""}</td><td>{when(j.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {events.length > 0 && (
        <section className="panel">
          <h2>Billing history</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th className="num">Amount</th><th>When</th></tr></thead>
              <tbody>{events.map((e) => {
                const paise = (e.payload as { payload?: { payment?: { entity?: { amount?: number } } } }).payload?.payment?.entity?.amount;
                return <tr key={e.id}><td>{e.type}</td><td className="num">{paise ? `₹${(paise / 100).toLocaleString("en-IN")}` : "—"}</td><td>{when(e.createdAt)}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
