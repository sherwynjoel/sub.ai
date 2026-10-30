import Link from "next/link";
import AdminAi from "@/components/AdminAi";
import AdminBento from "@/components/admin/AdminBento";
import { desc, eq } from "drizzle-orm";
import { db, jobs, users } from "@/db";
import { DEFAULT_MODELS, getAiConfig, PROVIDERS } from "@/lib/ai";
import { dashboard, mins, overview, when } from "@/lib/admin";
import { connectionStatus } from "@/lib/secrets";

export default async function Overview() {
  const [o, dash, cfg, conns, recentFails] = await Promise.all([
    overview(),
    dashboard(),
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

      <AdminBento data={JSON.parse(JSON.stringify(dash))} />

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
