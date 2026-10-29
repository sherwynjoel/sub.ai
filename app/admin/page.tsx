import Link from "next/link";
import AdminAi from "@/components/AdminAi";
import { desc, eq } from "drizzle-orm";
import { db, jobs, users } from "@/db";
import { DEFAULT_MODELS, getAiConfig, PROVIDERS } from "@/lib/ai";
import { inr, mins, overview, when } from "@/lib/admin";
import { PLANS, PAID } from "@/lib/plans";
import { connectionStatus } from "@/lib/secrets";

export default async function Overview() {
  const [o, cfg, conns, recentFails] = await Promise.all([
    overview(),
    getAiConfig(),
    connectionStatus(),
    db.select({ j: jobs, email: users.email }).from(jobs).innerJoin(users, eq(users.id, jobs.userId))
      .where(eq(jobs.status, "failed")).orderBy(desc(jobs.createdAt)).limit(5),
  ]);
  const has = (n: string) => conns.some((c) => c.name === n && c.source);
  const aiKey = { gemini: "GEMINI_API_KEY", sarvam: "SARVAM_API_KEY", openai: "OPENAI_API_KEY", groq: "GROQ_API_KEY", custom: "AI_API_KEY" }[cfg.provider] ?? "";
  const todo = [
    !has(aiKey) && `Add the ${cfg.provider} API key so videos can be subtitled.`,
    !has("RAZORPAY_KEY_ID") || !has("RAZORPAY_KEY_SECRET") ? "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET so users can pay." : null,
    !has("RAZORPAY_WEBHOOK_SECRET") && "Set RAZORPAY_WEBHOOK_SECRET (the secret on the Razorpay webhook) as the backup for payments.",
  ].filter(Boolean) as string[];

  return (
    <>
      <h1>Overview</h1>

      {todo.length > 0 && (
        <section className="panel notice-panel">
          <h2>Finish setup</h2>
          <ul>{todo.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="muted small">Keys are set on the server in <code>/opt/vasanam/.env.local</code>, then <code>pm2 restart vasanam-web vasanam-worker</code>.</p>
        </section>
      )}

      <section className="stat-group">
        <h2>Operations</h2>
        <dl className="stats">
          <div className="stat">
            <dt>Worker</dt>
            <dd><span className={`status ${o.worker.online ? "good" : "bad"}`}>{o.worker.online ? "Running" : "Stopped"}</span></dd>
            <span className="sub">Last seen {when(o.worker.last)}</span>
          </div>
          <div className="stat"><dt>In the queue</dt><dd>{o.jobs.queued + o.jobs.processing}</dd><span className="sub">{o.jobs.processing} processing now</span></div>
          <div className="stat"><dt>Projects today</dt><dd>{o.jobs.today}</dd><span className="sub">{o.jobs.failedToday} failed</span></div>
          <div className="stat"><dt>Minutes subtitled, 30 days</dt><dd>{o.jobs.minutes30d.toLocaleString("en-IN")}</dd><span className="sub">Using {cfg.provider} / {cfg.model}</span></div>
        </dl>
      </section>
      <section className="stat-group">
        <h2>Customers and revenue</h2>
        <dl className="stats">
          <div className="stat"><dt>Users</dt><dd>{o.users.total.toLocaleString("en-IN")}</dd><span className="sub">{o.users.new7d} new this week</span></div>
          <div className="stat"><dt>On paid plans</dt><dd>{o.subscribers}</dd><span className="sub">{PAID.map((p) => `${PLANS[p].name} ${o.byPlan[p] ?? 0}`).join(", ")}</span></div>
          <div className="stat"><dt>Monthly recurring revenue</dt><dd>{inr(o.mrr)}</dd><span className="sub">Active subscriptions at list price</span></div>
          <div className="stat"><dt>Collected, 30 days</dt><dd>{inr(o.revenue30d)}</dd><span className="sub">{o.charges30d} Razorpay charges</span></div>
        </dl>
      </section>

      {!o.worker.online && (
        <p className="error">The worker isn&apos;t running, so uploads will wait in the queue. Start it with <code>npm run worker</code> (or <code>pm2 restart vasanam-worker</code> on the server).</p>
      )}

      <section className="panel">
        <h2>Subtitle AI</h2>
        <p className="muted">Which service writes the subtitles. New uploads use this right away; each project records what made it. Its key is set on the server.</p>
        <AdminAi current={cfg} providers={[...PROVIDERS]} defaults={DEFAULT_MODELS} />
      </section>

      <section className="panel">
        <h2>Recent failures</h2>
        {recentFails.length === 0 ? (
          <p className="muted">No failed projects.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>User</th><th>Reason</th><th>When</th></tr></thead>
              <tbody>
                {recentFails.map(({ j, email }) => (
                  <tr key={j.id}><td>{j.filename}<span className="muted">{mins(j.durationSec)}</span></td><td>{email}</td><td>{j.error}</td><td>{when(j.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p><Link href="/admin/jobs?status=failed">See all failed projects</Link></p>
      </section>
    </>
  );
}
