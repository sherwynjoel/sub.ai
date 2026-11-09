import Link from "next/link";
import { desc, ilike, or } from "drizzle-orm";
import { adminLog, db } from "@/db";
import { when } from "@/lib/admin";

/** Every change an admin made, newest first. */
export default async function AdminLogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim();
  const rows = await db.select().from(adminLog)
    .where(q ? or(ilike(adminLog.adminEmail, `%${q}%`), ilike(adminLog.userEmail, `%${q}%`), ilike(adminLog.action, `%${q}%`)) : undefined)
    .orderBy(desc(adminLog.id)).limit(300);
  return (
    <>
      <h1>Admin log</h1>
      <form className="filters" method="get">
        <label>Search<input type="search" name="q" defaultValue={q} placeholder="Admin, user or action" /></label>
        <button className="btn small">Search</button>
        {q && <Link href="/admin/log" className="btn ghost small">Clear</Link>}
      </form>
      <section className="panel">
        <p className="muted">Who changed what: plans, minutes, blocks, notes, retries, deletions, emails and site settings.</p>
        {rows.length === 0 ? <p className="muted">Nothing yet.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>When</th><th>Admin</th><th>What</th><th>User</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td>{when(r.createdAt)}</td><td>{r.adminEmail}</td><td>{r.action}{r.detail ? <span className="muted"> · {r.detail}</span> : null}</td>
                <td>{r.userId ? <Link href={`/admin/users/${r.userId}`}>{r.userEmail}</Link> : "—"}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
