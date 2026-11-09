import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import Action from "@/components/admin/Action";
import BlockUser from "@/components/admin/BlockUser";
import UserNote from "@/components/admin/UserNote";
import ResetLink from "@/components/admin/ResetLink";
import UserPlanForm from "@/components/admin/UserPlanForm";
import { adminLog, billingEvents, creditLog, db, jobs, users } from "@/db";
import { mins, requireAdmin, when } from "@/lib/admin";
import { effectivePlan, longDate, minSec, passEnd, PLANS, secondsLeft } from "@/lib/plans";

const USE: Record<string, string> = { upload: "Subtitles made", translate: "Translated", remake: "Made again", extra: "Extra sound", refund: "Given back", bonus: "Minutes from admin" };

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) notFound();
  const [projects, events, uses, sameIp, actions] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.userId, u.id)).orderBy(desc(jobs.createdAt)).limit(20),
    u.subscriptionId
      ? db.select().from(billingEvents).where(sql`${billingEvents.payload}->'payload'->'subscription'->'entity'->>'id' = ${u.subscriptionId}`).orderBy(desc(billingEvents.createdAt)).limit(20)
      : Promise.resolve([]),
    db.select().from(creditLog).where(eq(creditLog.userId, u.id)).orderBy(desc(creditLog.id)).limit(40),
    u.signupIp ? db.select({ id: users.id, email: users.email, createdAt: users.createdAt, blockedAt: users.blockedAt }).from(users)
      .where(and(eq(users.signupIp, u.signupIp), ne(users.id, u.id))).orderBy(desc(users.createdAt)).limit(20) : Promise.resolve([]),
    db.select().from(adminLog).where(eq(adminLog.userId, u.id)).orderBy(desc(adminLog.id)).limit(20),
  ]);
  const end = passEnd(u);
  const plan = effectivePlan(u);
  const url = `/api/admin/users/${u.id}`;

  return (
    <>
      <p><Link href="/admin/users" className="muted">Users</Link></p>
      <h1>{u.name}</h1>
      {u.blockedAt && <p className="error panel">Blocked {when(u.blockedAt)}{u.blockReason ? `: ${u.blockReason}` : ""}. They can&apos;t sign in or use the plugin.</p>}
      <div className="two-col">
        <section className="panel">
          <h2>Account</h2>
          <dl className="kv">
            <dt>Email</dt><dd>{u.email}</dd>
            <dt>Joined</dt><dd>{when(u.createdAt)}</dd>
            <dt>Plan</dt><dd>{PLANS[plan].name}{u.plan !== plan ? ` (was ${PLANS[u.plan as keyof typeof PLANS]?.name ?? u.plan}, expired)` : ""}</dd>
            <dt>Pass ends</dt><dd>{end ? longDate(end) : "—"}</dd>
            <dt>Email confirmed</dt><dd>{u.emailVerifiedAt ? "Yes" : "No"}</dd>
            <dt>Minutes used</dt><dd>{mins(Math.max(0, u.secondsUsed))} of {PLANS[plan].minutes.toLocaleString("en-IN")} min</dd>
            <dt>Minutes left</dt><dd>{minSec(secondsLeft(u))}</dd>
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
            <ResetLink url={url} email={u.email} />
            {u.id !== me.id && (
              <Action url={url} body={{ action: "set_admin", value: !u.isAdmin }} label={u.isAdmin ? "Remove admin" : "Make admin"}
                confirm={u.isAdmin ? `Remove admin access from ${u.email}?` : `Give ${u.email} full admin access, including API keys?`} />
            )}
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Note</h2>
          <UserNote url={url} note={u.adminNote ?? ""} />
        </section>
        <section className="panel">
          <h2>{u.blockedAt ? "Blocked" : "Block"}</h2>
          {u.isAdmin ? <p className="muted">Admins can&apos;t be blocked.</p> : <BlockUser url={url} email={u.email} blocked={!!u.blockedAt} />}
          <h2 className="spaced">Same connection</h2>
          {sameIp.length === 0 ? <p className="muted small">No other account signed up from this internet connection.</p> : (
            <>
              <p className="muted small">{sameIp.length} other account{sameIp.length === 1 ? "" : "s"} signed up from the same internet connection (could be one person making many free trials, or a shared office/home network).</p>
              <ul className="plain-list">{sameIp.map((o) => <li key={o.id}><Link href={`/admin/users/${o.id}`}>{o.email}</Link> <span className="muted small">{when(o.createdAt)}{o.blockedAt ? " · blocked" : ""}</span></li>)}</ul>
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Minutes history</h2>
        {uses.length === 0 ? <p className="muted">No minutes used yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Video</th><th>What</th><th className="num">Minutes</th></tr></thead>
              <tbody>{uses.map((r) => (
                <tr key={r.id}><td>{when(r.createdAt)}</td><td>{r.video}</td><td>{USE[r.kind] ?? r.kind}{r.detail ? <span className="muted"> · {r.detail}</span> : null}</td>
                  <td className="num">{r.seconds < 0 ? `+${minSec(-r.seconds)}` : `−${minSec(r.seconds)}`}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Projects</h2>
        {projects.length === 0 ? <p className="muted">No projects yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th className="num">Length</th><th>Status</th><th>Uploaded</th></tr></thead>
              <tbody>{projects.map((j) => (
                <tr key={j.id}><td><Link href={`/admin/jobs/${j.id}`}>{j.filename}</Link></td><td className="num">{mins(j.durationSec)}</td><td>{j.status}{j.error ? ` — ${j.error.slice(0, 80)}` : ""}</td><td>{when(j.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {actions.length > 0 && (
        <section className="panel">
          <h2>Changes by admins</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>When</th><th>Admin</th><th>What</th></tr></thead>
            <tbody>{actions.map((a) => <tr key={a.id}><td>{when(a.createdAt)}</td><td>{a.adminEmail}</td><td>{a.action}{a.detail ? <span className="muted"> · {a.detail}</span> : null}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}

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
