import ApiKeyBox from "@/components/ApiKeyBox";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  const u = await requireUser();
  return (
    <>
      <h1 className="page-title">Plugin</h1>
      <div className="plugin-grid">
        <section className="panel">
          <h2>1. Install</h2>
          <p>Premiere Pro or After Effects 2022+, Windows or macOS.</p>
          <a className="btn" href="/downloads/vasanam-panel.zxp" download>Download panel (.zxp)</a>
          <p className="muted small spaced">
            Open it with the free <a href="https://aescripts.com/learn/zxp-installer/" target="_blank" rel="noreferrer">ZXP Installer</a>, then
            restart and open <strong>Window → Extensions → Vasanam</strong>.
          </p>
        </section>
        <section className="panel">
          <h2>2. Connect</h2>
          <p>Paste this key into the panel once. Keep it private.</p>
          <ApiKeyBox hint={u.apiKeyHint} />
        </section>
        <section className="panel wide">
          <h2>3. Generate</h2>
          <p className="muted">Select a clip, pick a language, click <em>Generate subtitles</em>. Premiere gets a caption track; After Effects gets text layers.</p>
        </section>
      </div>
    </>
  );
}
