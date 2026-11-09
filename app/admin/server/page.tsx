import { eq } from "drizzle-orm";
import AlertTest from "@/components/admin/AlertTest";
import { db, users } from "@/db";
import { when } from "@/lib/admin";
import { getAiConfig } from "@/lib/ai";
import { emailReady } from "@/lib/email";
import { alertStates, checkHealth } from "@/lib/health";
import { getSecret, type ConnectionName } from "@/lib/secrets";

const KEY: Record<string, ConnectionName> = { gemini: "GEMINI_API_KEY", sarvam: "SARVAM_API_KEY", openai: "OPENAI_API_KEY", groq: "GROQ_API_KEY", custom: "AI_API_KEY" };
const Row = ({ ok, label, detail }: { ok: boolean | null; label: string; detail: string }) => (
  <tr><td><span className={`status ${ok === null ? "neutral" : ok ? "good" : "bad"}`}>{ok === null ? "—" : ok ? "OK" : "Problem"}</span></td><td><b>{label}</b></td><td className="muted">{detail}</td></tr>
);

/** The server at a glance, and the alert emails. */
export default async function Server() {
  const [h, cfg, mail, alerts, admins, rzp] = await Promise.all([
    checkHealth(), getAiConfig(), emailReady(), alertStates(),
    db.select({ email: users.email }).from(users).where(eq(users.isAdmin, true)),
    getSecret("RAZORPAY_KEY_ID"),
  ]);
  const aiKey = KEY[cfg.provider] ? !!(await getSecret(KEY[cfg.provider])) : false;
  const usedPct = h.freeGb !== null && h.totalGb ? Math.round(((h.totalGb - h.freeGb) / h.totalGb) * 100) : null;
  const ago = h.worker ? Math.round((h.at.getTime() - h.worker.getTime()) / 1000) : null;

  return (
    <>
      <h1>Server</h1>
      <p className={h.ok ? "notice panel" : "error panel"}>{h.ok ? "Everything is working." : <>Needs a look:<br />{h.problems.map((p) => <span key={p}>• {p}<br /></span>)}</>}</p>
      <section className="panel">
        <h2>Health</h2>
        <div className="table-wrap"><table><tbody>
          <Row ok={h.dbOk} label="Database" detail={h.dbOk ? "Answering" : "Can't be reached"} />
          <Row ok={ago !== null && ago < 90} label="Worker (makes the subtitles)" detail={ago === null ? "Never seen" : `Last seen ${ago < 120 ? `${ago} s` : `${Math.round(ago / 60)} min`} ago`} />
          <Row ok={!h.stuck} label="Stuck videos" detail={h.stuck ? `${h.stuck} waiting or processing for over 15 minutes` : "None"} />
          <Row ok={!(h.failedHour >= 3 && !h.doneHour)} label="Last hour" detail={`${h.doneHour} worked, ${h.failedHour} failed`} />
          <Row ok={h.freeGb === null ? null : h.freeGb >= 2} label="Disk" detail={h.freeGb === null ? "Unknown" : `${h.freeGb.toFixed(1)} GB free of ${h.totalGb!.toFixed(0)} GB (${usedPct}% used)`} />
          <Row ok={aiKey} label="AI service" detail={`${cfg.provider} / ${cfg.model}${aiKey ? ", key saved" : ": key missing on the server"}`} />
          <Row ok={mail} label="Email" detail={mail ? "Can send (resets, confirmations, alerts)" : "Not set up: no alerts or resets can be sent"} />
          <Row ok={!!rzp} label="Payments" detail={rzp ? "Razorpay keys saved" : "Razorpay keys missing"} />
        </tbody></table></div>
        {usedPct !== null && <div className="disk-bar" aria-label={`Disk ${usedPct}% used`}><span style={{ width: `${usedPct}%` }} className={usedPct > 85 ? "hot" : ""} /></div>}
      </section>
      <section className="panel">
        <h2>Alert emails</h2>
        <p className="muted small">Every 5 minutes the website checks the worker, the database, stuck or failing videos and the disk; the worker checks that the website answers. When something breaks, every admin gets an email (again after 3 hours if it stays broken), and another when it works again.</p>
        <p>Goes to: {admins.map((a) => a.email).join(", ") || "no admins"}</p>
        <dl className="kv">
          <dt>Last site alert</dt><dd>{alerts.site?.at ? `${when(new Date(alerts.site.at))}: ${alerts.site.problems.join("; ") || "working again"}` : "None yet"}</dd>
          <dt>Last website-down alert</dt><dd>{alerts.web?.at ? `${when(new Date(alerts.web.at))}: ${alerts.web.problems.join("; ") || "working again"}` : "None yet"}</dd>
        </dl>
        <AlertTest />
      </section>
    </>
  );
}
