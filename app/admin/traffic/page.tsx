import { and, desc, gt, gte, isNotNull, ne, sql } from "drizzle-orm";
import { db, jobs, pageViews, users } from "@/db";

export const dynamic = "force-dynamic";

const DAYS = 30;

/** The last DAYS days of visits and sign-ups. */
async function load() {
  const since = new Date(Date.now() + 5.5 * 3600e3 - (DAYS - 1) * 864e5).toISOString().slice(0, 10);
  const from = new Date(Date.now() - DAYS * 864e5);
  const inRange = gte(pageViews.day, since);
  const [daily, pages, sources, [signups], [made], [paid]] = await Promise.all([
    db.select({ day: pageViews.day, visitors: sql<number>`count(distinct ${pageViews.visitor})::int`, views: sql<number>`count(*)::int` })
      .from(pageViews).where(inRange).groupBy(pageViews.day).orderBy(pageViews.day),
    db.select({ path: pageViews.path, visitors: sql<number>`count(distinct (${pageViews.day}, ${pageViews.visitor}))::int`, views: sql<number>`count(*)::int` })
      .from(pageViews).where(inRange).groupBy(pageViews.path).orderBy(desc(sql`2`)).limit(15),
    db.select({ from: sql<string>`coalesce(${pageViews.source}, ${pageViews.referrer}, 'Direct / unknown')`, visitors: sql<number>`count(distinct (${pageViews.day}, ${pageViews.visitor}))::int` })
      .from(pageViews).where(inRange).groupBy(sql`1`).orderBy(desc(sql`2`)).limit(15),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(gt(users.createdAt, from)),
    db.select({ n: sql<number>`count(distinct ${jobs.userId})::int` }).from(jobs).where(sql`${jobs.userId} in (select id from users where created_at > ${from})`),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(gt(users.createdAt, from), ne(users.plan, "free"), isNotNull(users.periodEnd))),
  ]);
  return { daily, pages, sources, signups: signups.n, made: made.n, paid: paid.n };
}

/** Visits (counted without cookies, see /api/hit) and how many visitors go on to sign up, make a project and pay. */
export default async function Traffic() {
  const { daily, pages, sources, ...n } = await load();
  const signups = { n: n.signups }, made = { n: n.made }, paid = { n: n.paid };
  const visitors = daily.reduce((n, d) => n + d.visitors, 0), views = daily.reduce((n, d) => n + d.views, 0);
  const top = Math.max(1, ...daily.map((d) => d.visitors));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const steps: [string, number, string][] = [
    ["Visitors", visitors, "a person counts once a day"],
    ["Signed up", signups.n, `${pct(signups.n, visitors)} of visitors`],
    ["Made a project", made.n, `${pct(made.n, signups.n)} of sign-ups`],
    ["Paid", paid.n, `${pct(paid.n, made.n)} of those`],
  ];

  return (
    <>
      <h1>Traffic</h1>
      <p className="muted">Last {DAYS} days. Counted on our own server without cookies; bots and the admin pages are left out.</p>

      <section className="stat-group">
        <h2>From visit to paying customer</h2>
        <dl className="stats">
          {steps.map(([label, n, sub]) => <div className="stat" key={label}><dt>{label}</dt><dd>{n.toLocaleString("en-IN")}</dd><span className="sub">{sub}</span></div>)}
        </dl>
      </section>

      <section className="panel">
        <h2>Visitors per day</h2>
        {daily.length === 0 ? <p className="muted">No visits counted yet.</p> : (
          <div className="traffic-chart" role="img" aria-label={`Visitors per day, ${visitors} in total`}>
            {daily.map((d) => (
              <div key={d.day} className="traffic-day" title={`${d.day}: ${d.visitors} visitors, ${d.views} page views`}>
                <i style={{ height: `${(d.visitors / top) * 100}%` }} />
                <span>{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="muted small">{visitors.toLocaleString("en-IN")} visitors · {views.toLocaleString("en-IN")} page views</p>
      </section>

      <div className="traffic-tables">
        <section className="panel">
          <h2>Where visitors come from</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Source</th><th className="num">Visitors</th></tr></thead>
            <tbody>{sources.map((s) => <tr key={s.from}><td>{s.from}</td><td className="num">{s.visitors}</td></tr>)}</tbody>
          </table></div>
          <p className="muted small">Add <code>?ref=instagram</code> (or any name) to links you share to see them here.</p>
        </section>
        <section className="panel">
          <h2>Top pages</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Page</th><th className="num">Visitors</th><th className="num">Views</th></tr></thead>
            <tbody>{pages.map((p) => <tr key={p.path}><td>{p.path}</td><td className="num">{p.visitors}</td><td className="num">{p.views}</td></tr>)}</tbody>
          </table></div>
        </section>
      </div>
    </>
  );
}
