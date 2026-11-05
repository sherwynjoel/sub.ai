import Link from "next/link";
import StyledCaption from "@/components/StyledCaption";
import type { styleTable } from "@/lib/styleUsage";

const SAMPLE = "Your captions";
const sample = (styleId: string) => (
  <span className="style-sample" aria-hidden="true"><StyledCaption styleId={styleId} text={SAMPLE} start={0.25} end={2.75} time={2.74} /></span>
);
const num = (n: number) => n.toLocaleString("en-IN");
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Which caption styles people use, and which nobody does. */
export default function StyleUsage({ table: { total, used, unused }, recent, base = "/admin/styles" }: {
  table: ReturnType<typeof styleTable>; recent: boolean; base?: string;
}) {
  const offered = used.filter((u) => !u.tags.includes("No longer offered")).length + unused.length;
  return (
    <>
      <h1>Styles</h1>
      <div className="use-period">
        <Link href={base} className={`btn small${recent ? " ghost" : ""}`} aria-current={recent ? undefined : "page"}>All time</Link>
        <Link href={`${base}?period=30`} className={`btn small${recent ? "" : " ghost"}`} aria-current={recent ? "page" : undefined}>Last 30 days</Link>
      </div>

      <dl className="stats">
        <div className="stat"><dt>Projects counted</dt><dd>{num(total)}</dd></div>
        <div className="stat"><dt>Most used</dt><dd className="use-top">{used[0]?.name ?? "—"}</dd>{used[0] && <span className="sub">{Math.round(used[0].share * 100)}% of projects</span>}</div>
        <div className="stat"><dt>Styles used</dt><dd>{num(used.length)}</dd><span className="sub">of {num(offered)} on offer</span></div>
        <div className="stat"><dt>Never used</dt><dd>{num(unused.length)}</dd></div>
      </dl>

      <section className="panel">
        <h2>Most used</h2>
        {used.length === 0 ? <p className="muted">No finished projects from users {recent ? "in the last 30 days" : "yet"}.</p> : (
          <div className="table-wrap">
            <table className="use-table">
              <thead><tr><th className="use-look" aria-label="Preview"></th><th>Style</th><th className="num">Projects</th><th className="num">People</th><th className="num">Videos exported</th><th>Last used</th></tr></thead>
              <tbody>
                {used.map((u) => (
                  <tr key={u.style}>
                    <td className="use-look">{sample(u.style)}</td>
                    <td>
                      <strong>{u.name}</strong>
                      <span className="muted">{u.group}</span>
                      {u.tags.map((t) => <span key={t} className="use-tag">{t}</span>)}
                    </td>
                    <td className="num">{num(u.projects)}<span className="use-bar"><i style={{ width: `${Math.max(2, (u.projects / used[0].projects) * 100)}%` }} /></span></td>
                    <td className="num">{num(u.people)}</td>
                    <td className="num">{num(u.videos)}</td>
                    <td>{day(u.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">
          Each finished project counts once, under the style it uses now, so a project that changed style counts only for its latest. Deleted projects and admin accounts aren&apos;t counted.
          {" "}<strong>Default</strong> and <strong>Shown first</strong> styles are the easiest to pick, so their counts run high.
        </p>
      </section>

      {unused.length > 0 && (
        <section className="panel">
          <h2>Never used {recent && <small className="muted">in the last 30 days</small>}</h2>
          <ul className="use-unused">
            {unused.map((s) => <li key={s.id}>{sample(s.id)}<strong>{s.name}</strong><span className="muted small">{s.group}</span></li>)}
          </ul>
        </section>
      )}
    </>
  );
}
