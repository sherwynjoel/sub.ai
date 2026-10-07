import AdminAi from "@/components/AdminAi";
import ConnectionRow from "@/components/admin/ConnectionRow";
import TestButton from "@/components/admin/TestButton";
import CopyText from "@/components/admin/CopyText";
import { DEFAULT_MODELS, getAiConfig, PROVIDERS } from "@/lib/ai";
import { when, workerStatus } from "@/lib/admin";
import { connectionStatus } from "@/lib/secrets";

export default async function Connections() {
  const [conns, cfg, worker] = await Promise.all([connectionStatus(), getAiConfig(), workerStatus()]);
  const group = (g: string) => conns.filter((c) => c.group === g);
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  return (
    <>
      <h1>Connections</h1>
      <p className="muted">
        Keys you save here are encrypted and override <code>.env.local</code>. They&apos;re never shown again in full;
        paste a new value to replace one, or clear it to fall back to the server&apos;s settings file.
      </p>

      <section className="panel">
        <h2>Subtitle AI</h2>
        <p className="muted">Which service writes the subtitles. New uploads use this right away; each project records what made it.</p>
        <AdminAi current={cfg} providers={[...PROVIDERS]} defaults={DEFAULT_MODELS} />
        <div className="test-row">
          <TestButton service={cfg.provider} label={`Test ${cfg.provider} connection`} />
        </div>
      </section>

      <section className="panel">
        <h2>AI keys</h2>
        {group("ai").map((c) => <ConnectionRow key={c.name} {...c} />)}
        <div className="test-row">
          {PROVIDERS.map((p) => <TestButton key={p} service={p} label={`Test ${p}`} />)}
        </div>
      </section>

      <section className="panel">
        <h2>Razorpay</h2>
        <p className="muted">Use Test mode keys first, then switch to Live keys when you launch.</p>
        {group("razorpay").map((c) => <ConnectionRow key={c.name} {...c} />)}
        <div className="conn">
          <strong>Webhook URL</strong>
          <p className="muted small">In Razorpay → Webhooks, add this URL with all <code>subscription.*</code> events, and save the same secret above.</p>
          <CopyText text={`${appUrl}/api/billing/webhook`} />
        </div>
        <div className="test-row"><TestButton service="razorpay" label="Test Razorpay and check plans" /></div>
      </section>

      <section className="panel">
        <h2>Worker</h2>
        <p>
          <span className={`status ${worker.online ? "good" : "bad"}`}>{worker.online ? "Running" : "Stopped"}</span>{" "}
          <span className="muted">Last seen {when(worker.last)}</span>
        </p>
        <p className="muted">The worker turns uploads into subtitles. It picks up key and model changes on the next project, with no restart needed.</p>
      </section>
    </>
  );
}
