import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq, sql } from "drizzle-orm";
import AdminAi from "@/components/AdminAi";
import { db, jobs, users } from "@/db";
import { DEFAULT_MODELS, getAiConfig, PROVIDERS } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { effectivePlan } from "@/lib/plans";
import "../app/app.css";

export default async function Admin() {
  const u = await requireUser();
  if (!u.isAdmin) notFound();
  const [cfg, people, recent, [stats]] = await Promise.all([
    getAiConfig(),
    db.select().from(users).orderBy(desc(users.createdAt)).limit(50),
    db.select({ j: jobs, email: users.email }).from(jobs).innerJoin(users, eq(users.id, jobs.userId)).orderBy(desc(jobs.createdAt)).limit(50),
    db.select({
      jobs: count(),
      minutes: sql<number>`coalesce(round(sum(${jobs.durationSec}) / 60), 0)`,
      failed: sql<number>`count(*) filter (where ${jobs.status} = 'failed')`,
    }).from(jobs),
  ]);

  return (
    <>
      <header className="app-head">
        <div className="wrap site-head">
          <Link href="/app" className="logo"><i />{BRAND.name} admin</Link>
          <Link href="/app" className="btn ghost small">Back to app</Link>
        </div>
      </header>
      <main className="wrap app-main admin">
        <p className="muted">{people.length} recent users · {stats.jobs} projects · {stats.minutes} minutes processed · {stats.failed} failed</p>

        <section className="panel">
          <h2>Subtitle AI</h2>
          <p className="muted">New projects use this provider and model. Compare quality by re-uploading the same clip after switching; each project records what made it.</p>
          <AdminAi current={cfg} providers={[...PROVIDERS]} defaults={DEFAULT_MODELS} />
        </section>

        <section className="panel">
          <h2>Recent projects</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>User</th><th>Length</th><th>Status</th><th>Made with</th><th>When</th></tr></thead>
              <tbody>
                {recent.map(({ j, email }) => (
                  <tr key={j.id}>
                    <td>{j.filename}</td><td>{email}</td><td>{Math.round(j.durationSec / 60)} min</td>
                    <td title={j.error ?? undefined}>{j.status}{j.error ? ` — ${j.error.slice(0, 60)}` : ""}</td>
                    <td>{j.provider ? `${j.provider} / ${j.model}` : "—"}</td>
                    <td>{j.createdAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Users</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Used</th><th>Subscription</th><th>Joined</th></tr></thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.email}</td><td>{effectivePlan(p)}</td><td>{Math.round(p.secondsUsed / 60)} min</td>
                    <td>{p.subscriptionStatus ?? "—"}</td><td>{p.createdAt.toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
