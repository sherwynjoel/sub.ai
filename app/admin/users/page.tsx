import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db, jobs, users } from "@/db";
import { mins, when } from "@/lib/admin";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";

const PER_PAGE = 50;

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const where = q ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`), ilike(users.adminNote, `%${q}%`)) : undefined;
  const projectCount = sql<number>`(select count(*)::int from ${jobs} where ${jobs.userId} = ${users.id})`;

  const [rows, [{ total }], crowds] = await Promise.all([
    db.select({ u: users, projects: projectCount }).from(users).where(where).orderBy(desc(users.createdAt)).limit(PER_PAGE).offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(users).where(where),
    // Free trials started from one internet connection in the last 30 days: 3 or more is worth a look.
    db.select({ ip: users.signupIp, n: sql<number>`count(*)::int`, emails: sql<string[]>`array_agg(${users.email} order by ${users.createdAt} desc)`, ids: sql<string[]>`array_agg(${users.id}::text order by ${users.createdAt} desc)` })
      .from(users).where(sql`${users.signupIp} is not null and ${users.createdAt} > now() - interval '30 days' and ${users.plan} = 'free'`)
      .groupBy(users.signupIp).having(sql`count(*) >= 3`).orderBy(sql`count(*) desc`).limit(10),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <h1>Users</h1>
      <form className="filters" method="get">
        <label>Search<input type="search" name="q" defaultValue={q} placeholder="Name, email or note" /></label>
        <button className="btn small">Search</button>
        {q && <Link href="/admin/users" className="btn ghost small">Clear</Link>}
      </form>
      {crowds.length > 0 && !q && (
        <section className="panel notice-panel">
          <h2>Many free trials from one connection</h2>
          <p className="muted small">In the last 30 days. Could be one person making several free accounts, or a shared office, college or mobile network. Open an account to block it.</p>
          <ul className="plain-list">{crowds.map((c) => (
            <li key={c.ip}><b>{c.n} accounts</b>: {c.emails.slice(0, 6).map((e, i) => <span key={c.ids[i]}>{i > 0 && ", "}<Link href={`/admin/users/${c.ids[i]}`}>{e}</Link></span>)}{c.n > 6 ? ` and ${c.n - 6} more` : ""}</li>
          ))}</ul>
        </section>
      )}
      <section className="panel">
        <p className="muted">{total.toLocaleString("en-IN")} users</p>
        {rows.length === 0 ? (
          <p className="muted">No users match “{q}”.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Plan</th><th className="num">Minutes left</th><th className="num">Projects</th><th>Subscription</th><th>Joined</th></tr></thead>
              <tbody>
                {rows.map(({ u, projects }) => {
                  const plan = effectivePlan(u);
                  return (
                    <tr key={u.id}>
                      <td><Link href={`/admin/users/${u.id}`}>{u.name}</Link><span className="muted">{u.email}{u.isAdmin ? " · admin" : ""}</span>{u.blockedAt && <span className="status bad">Blocked</span>}</td>
                      <td>{PLANS[plan].name}</td>
                      <td className="num">{mins(secondsLeft(u))}</td>
                      <td className="num">{projects}</td>
                      <td>{u.subscriptionStatus ?? "—"}</td>
                      <td>{when(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="pager" aria-label="Pages">
            {page > 1 && <Link href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>Previous</Link>}
            <span className="muted">Page {page} of {pages}</span>
            {page < pages && <Link href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>Next</Link>}
          </nav>
        )}
      </section>
    </>
  );
}
