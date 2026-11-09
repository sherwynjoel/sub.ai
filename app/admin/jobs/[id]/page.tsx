import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Action from "@/components/admin/Action";
import { creditLog, db, jobs, users } from "@/db";
import { requireAdmin, when } from "@/lib/admin";
import { CAPTION_STYLES } from "@/lib/captionStyles";
import { languageOf } from "@/lib/languages";
import { minSec } from "@/lib/plans";

const t = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

/** One project as its owner sees it (read only): settings, what went wrong, every subtitle, and the minutes it used. */
export default async function AdminJob({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db.select({ j: jobs, email: users.email, name: users.name }).from(jobs).innerJoin(users, eq(users.id, jobs.userId)).where(eq(jobs.id, id));
  if (!row) notFound();
  const { j } = row;
  const uses = await db.select().from(creditLog).where(eq(creditLog.jobId, j.id)).orderBy(creditLog.id);
  const style = CAPTION_STYLES.find((s) => s.id === j.captionStyle)?.name ?? j.captionStyle;
  const took = j.status === "done" ? Math.round((j.updatedAt.getTime() - j.createdAt.getTime()) / 1000) : null;

  return (
    <>
      <p><Link href="/admin/jobs" className="muted">Operations</Link> · <Link href={`/admin/users/${j.userId}`} className="muted">{row.email}</Link></p>
      <h1>{j.filename}</h1>
      <div className="two-col">
        <section className="panel">
          <h2>Project</h2>
          <dl className="kv">
            <dt>User</dt><dd><Link href={`/admin/users/${j.userId}`}>{row.name}</Link> · {row.email}</dd>
            <dt>Status</dt><dd>{j.status}{j.status === "processing" ? ` ${j.progress}%` : ""}</dd>
            <dt>Length</dt><dd>{minSec(Math.ceil(j.durationSec))}</dd>
            <dt>Language</dt><dd>{languageOf(j.language).name} · {j.script}{j.withEnglish ? " + English" : ""}</dd>
            <dt>Style</dt><dd>{style}</dd>
            <dt>Made with</dt><dd>{j.provider ? `${j.provider} / ${j.model}` : "—"}</dd>
            <dt>Uploaded</dt><dd>{when(j.createdAt)}</dd>
            {took !== null && <><dt>Took</dt><dd>{minSec(took)}</dd></>}
            <dt>Video file</dt><dd>{j.filePath ? "Kept" : "Deleted"}</dd>
            <dt>Styled MP4</dt><dd>{j.renderStatus ?? "—"}{j.renderError ? ` · ${j.renderError}` : ""}</dd>
          </dl>
          {j.error && <p className="error">{j.error}</p>}
          <div className="btn-row spaced">
            {j.status === "failed" && j.filePath && <Action url={`/api/admin/jobs/${j.id}`} body={{ action: "retry" }} label="Try again" />}
          </div>
        </section>
        <section className="panel">
          <h2>Minutes used</h2>
          {uses.length === 0 ? <p className="muted">None recorded.</p> : (
            <table><tbody>{uses.map((u) => (
              <tr key={u.id}><td>{when(u.createdAt)}</td><td>{u.kind}{u.detail ? <span className="muted"> · {u.detail}</span> : null}</td><td className="num">{u.seconds < 0 ? `+${minSec(-u.seconds)}` : `−${minSec(u.seconds)}`}</td></tr>
            ))}</tbody></table>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>Subtitles ({j.cues?.length ?? 0})</h2>
        {!j.cues?.length ? <p className="muted">None yet.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>#</th><th>Time</th><th>{languageOf(j.language).name}</th>{j.withEnglish && <th>English</th>}</tr></thead>
            <tbody>{j.cues.map((c, i) => (
              <tr key={i}><td className="muted">{i + 1}</td><td className="num">{t(c.start)} – {t(c.end)}</td><td>{c.ta}</td>{j.withEnglish && <td>{c.en}</td>}</tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
