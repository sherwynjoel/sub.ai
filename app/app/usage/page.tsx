import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { creditLog, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { effectivePlan, longDate, minSec, passEnd, passExpired, PLANS, secondsLeft } from "@/lib/plans";

export const metadata = { title: "Usage" };

const WHAT: Record<string, string> = { upload: "Subtitles made", translate: "Translated", remake: "Captions made again", extra: "Extra sound", refund: "Given back" };
const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Where the user's minutes went: this pass at a glance, each video's total, then every use. */
export default async function Page() {
  const u = await requireUser();
  const rows = await db.select().from(creditLog).where(eq(creditLog.userId, u.id)).orderBy(desc(creditLog.createdAt), desc(creditLog.id)).limit(1000);
  const plan = effectivePlan(u), end = passEnd(u), ended = passExpired(u);
  const total = PLANS[plan].minutes * 60, left = secondsLeft(u), used = ended ? 0 : Math.max(0, Math.min(total, u.secondsUsed));
  const spent = rows.reduce((a, r) => a + r.seconds, 0);

  // Each video's total, newest first (a deleted project keeps its name here).
  const byVideo = new Map<string, { video: string; jobId: string | null; seconds: number; uses: number; last: Date }>();
  for (const r of rows) {
    const k = r.jobId ?? `name:${r.video}`, v = byVideo.get(k) ?? { video: r.video, jobId: r.jobId, seconds: 0, uses: 0, last: r.createdAt };
    v.seconds += r.seconds;
    if (r.kind !== "refund" && r.kind !== "extra") v.uses++;
    byVideo.set(k, v);
  }
  const videos = [...byVideo.values()];

  return (
    <>
      <h1 className="page-title">Usage</h1>
      <div className="usage-cards">
        <div className="panel stat-card"><span className="muted small">This pass</span><b>{ended ? "Ended" : PLANS[plan].name}</b><span className="muted small">{end ? `${ended ? "Ended" : "Expires"} ${longDate(end)}` : ""}</span></div>
        <div className="panel stat-card"><span className="muted small">Used this pass</span><b>{minSec(used)}</b><span className="muted small">of {PLANS[plan].minutes} min</span></div>
        <div className="panel stat-card"><span className="muted small">Left</span><b>{minSec(left)}</b><span className="muted small"><Link href="/app/billing">Billing</Link></span></div>
        <div className="panel stat-card"><span className="muted small">Used in all</span><b>{minSec(spent)}</b><span className="muted small">{videos.length} video{videos.length === 1 ? "" : "s"}</span></div>
      </div>

      <section className="panel usage-sec">
        <h2>By video</h2>
        {videos.length === 0 ? <p className="muted">Nothing yet. Minutes you use for a video show up here.</p> : (
          <div className="table-wrap"><table className="usage-table">
            <thead><tr><th>Video</th><th className="opt">Last used</th><th className="num">Times</th><th className="num">Minutes used</th></tr></thead>
            <tbody>{videos.map((v) => (
              <tr key={v.jobId ?? v.video}>
                <td className="vid">{v.jobId ? <Link href={`/app/jobs/${v.jobId}`}>{v.video}</Link> : v.video}</td>
                <td className="opt">{when(v.last)}</td><td className="num">{v.uses}</td><td className="num">{minSec(v.seconds)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel usage-sec">
        <h2>History</h2>
        <p className="muted small">Every time minutes were used, newest first. A video&apos;s length is used each time its subtitles are made, translated or made again; minutes for anything that failed are given back.</p>
        {rows.length === 0 ? <p className="muted">No history yet.</p> : (
          <div className="table-wrap"><table className="usage-table">
            <thead><tr><th>When</th><th>Video and what for</th><th className="num">Minutes</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className={r.seconds < 0 ? "back" : undefined}>
                <td>{when(r.createdAt)}</td>
                <td><span className="vid">{r.video}</span><br />{WHAT[r.kind] ?? r.kind}{r.detail ? <span className="muted"> · {r.detail}</span> : null}</td>
                <td className="num">{r.seconds < 0 ? `+${minSec(-r.seconds)} back` : `−${minSec(r.seconds)}`}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
