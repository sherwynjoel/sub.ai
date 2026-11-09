import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import Action from "@/components/admin/Action";
import { db, jobs, users } from "@/db";
import { mins, when } from "@/lib/admin";
import { minSec } from "@/lib/plans";
import { quality } from "@/lib/quality";

const PER_PAGE = 50;
const STATUSES = ["queued", "processing", "done", "failed"];
const LABEL: Record<string, [string, string]> = {
  queued: ["Waiting", "wait"], processing: ["Processing", "wait"], done: ["Done", "good"], failed: ["Failed", "bad"],
};

type Search = { status?: string; q?: string; page?: string };

export default async function Operations({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: SQL[] = [];
  if (sp.status && STATUSES.includes(sp.status)) filters.push(eq(jobs.status, sp.status));
  if (sp.q?.trim()) filters.push(or(ilike(jobs.filename, `%${sp.q.trim()}%`), ilike(users.email, `%${sp.q.trim()}%`))!);
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [{ total }], q] = await Promise.all([
    db.select({ j: jobs, email: users.email, userId: users.id }).from(jobs).innerJoin(users, eq(users.id, jobs.userId))
      .where(where).orderBy(desc(jobs.createdAt)).limit(PER_PAGE).offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(jobs).innerJoin(users, eq(users.id, jobs.userId)).where(where),
    quality(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p: number) => `/admin/jobs?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;

  return (
    <>
      <h1>Operations</h1>
      {q.queue.slow && (
        <p className="error panel">The queue is slow: {q.queue.waiting} video{q.queue.waiting === 1 ? "" : "s"} waiting{q.queue.oldest ? `, the oldest for ${Math.round(q.queue.waitMin)} min` : ""}. Check that the worker is running and the AI service is answering.</p>
      )}
      <dl className="stats">
        <div className="stat"><dt>Waiting now</dt><dd>{q.queue.waiting}</dd><span className="sub">{q.queue.processing} being made{q.queue.oldest ? `, oldest ${Math.round(q.queue.waitMin)} min` : ""}</span></div>
        <div className="stat"><dt>Worked, 30 days</dt><dd>{q.done}</dd><span className="sub">{q.failed} failed ({Math.round(q.failRate * 100)}%)</span></div>
        <div className="stat"><dt>Usual time</dt><dd>{q.speed.n ? minSec(Math.round(q.speed.median)) : "—"}</dd><span className="sub">{q.speed.n ? `Per video, last 7 days (${q.speed.n} videos)` : "No finished videos timed yet"}</span></div>
        <div className="stat"><dt>Per minute of video</dt><dd>{q.speed.perMin ? minSec(Math.round(q.speed.perMin)) : "—"}</dd><span className="sub">{q.speed.slowest ? `Slowest: ${minSec(Math.round(q.speed.slowest))}` : "Time to make subtitles"}</span></div>
      </dl>

      <div className="two-col">
        <section className="panel">
          <h2>Why videos failed (30 days)</h2>
          {q.reasons.length === 0 ? <p className="muted">Nothing failed. 🎉</p> : (
            <div className="table-wrap"><table><tbody>{q.reasons.slice(0, 10).map((r) => (
              <tr key={r.kind}><td className="num"><b>{r.n}×</b></td><td>{r.kind}<span className="muted small">Last: {when(r.last)} · <Link href={`/admin/jobs/${r.example.id}`}>{r.example.filename}</Link></span></td></tr>
            ))}</tbody></table></div>
          )}
        </section>
        <section className="panel">
          <h2>By AI service (30 days)</h2>
          {q.byProvider.length === 0 ? <p className="muted">No videos yet.</p> : (
            <div className="table-wrap"><table><thead><tr><th>Service</th><th className="num">Worked</th><th className="num">Failed</th></tr></thead>
              <tbody>{q.byProvider.map((p) => <tr key={p.provider}><td>{p.provider}</td><td className="num">{p.done}</td><td className="num">{p.failed}{p.done + p.failed ? ` (${Math.round((p.failed / (p.done + p.failed)) * 100)}%)` : ""}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
      <form className="filters" method="get">
        <label>Search<input type="search" name="q" defaultValue={sp.q} placeholder="File name or email" /></label>
        <label>Status
          <select name="status" defaultValue={sp.status ?? ""}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s][0]}</option>)}
          </select>
        </label>
        <button className="btn small">Filter</button>
        {(sp.q || sp.status) && <Link href="/admin/jobs" className="btn ghost small">Clear</Link>}
      </form>

      <section className="panel">
        <p className="muted">{total.toLocaleString("en-IN")} projects</p>
        {rows.length === 0 ? (
          <p className="muted">No projects match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>User</th><th className="num">Length</th><th>Status</th><th>Made with</th><th>Uploaded</th><th /></tr></thead>
              <tbody>
                {rows.map(({ j, email, userId }) => (
                  <tr key={j.id}>
                    <td><Link href={`/admin/jobs/${j.id}`}>{j.filename}</Link>{!j.filePath && <span className="muted">Video deleted</span>}</td>
                    <td><Link href={`/admin/users/${userId}`}>{email}</Link></td>
                    <td className="num">{mins(j.durationSec)}</td>
                    <td>
                      <span className={`status ${LABEL[j.status]?.[1] ?? "neutral"}`}>{LABEL[j.status]?.[0] ?? j.status}{j.status === "processing" ? ` ${j.progress}%` : ""}</span>
                      {j.error && <span className="muted">{j.error.slice(0, 120)}</span>}
                      {j.status === "done" && <span className="muted">{j.cues?.length ?? 0} subtitles</span>}
                    </td>
                    <td>{j.provider ? `${j.provider} / ${j.model}` : "—"}</td>
                    <td>{when(j.createdAt)}</td>
                    <td className="actions">
                      {j.status === "failed" && j.filePath && <Action url={`/api/admin/jobs/${j.id}`} body={{ action: "retry" }} label="Retry" />}{" "}
                      {j.status !== "processing" && (
                        <Action url={`/api/admin/jobs/${j.id}`} body={{ action: "delete" }} label="Delete" className="btn danger small"
                          confirm={`Delete "${j.filename}" and its subtitles for ${email}? This can't be undone.`} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="pager" aria-label="Pages">
            {page > 1 && <Link href={link(page - 1)}>Previous</Link>}
            <span className="muted">Page {page} of {pages}</span>
            {page < pages && <Link href={link(page + 1)}>Next</Link>}
          </nav>
        )}
      </section>
    </>
  );
}
