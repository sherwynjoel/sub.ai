import ApiKeyBox from "@/components/ApiKeyBox";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  const u = await requireUser();
  return (
    <>
      <h1 className="page-title">Premiere Pro & After Effects panel</h1>
      <div className="plugin-grid">
        <section className="panel">
          <h2>1. Download and install</h2>
          <p>Works with Premiere Pro and After Effects 2022 or newer, on Windows and macOS.</p>
          <a className="btn" href="/downloads/vasanam-panel.zxp" download>Download the panel (.zxp)</a>
          <ol className="howto">
            <li>Install the free <a href="https://aescripts.com/learn/zxp-installer/" target="_blank" rel="noreferrer">ZXP Installer</a>.</li>
            <li>Drag <strong>vasanam-panel.zxp</strong> into it and wait for “Installed”.</li>
            <li>Restart Premiere Pro or After Effects and open <strong>Window → Extensions → Vasanam</strong>.</li>
          </ol>
        </section>
        <section className="panel">
          <h2>2. Connect your account</h2>
          <p>Paste this key into the panel once. Keep it private; anyone with it can use your minutes.</p>
          <ApiKeyBox hint={u.apiKeyHint} />
        </section>
        <section className="panel wide">
          <h2>3. Make subtitles</h2>
          <ul className="howto">
            <li><strong>Premiere Pro:</strong> select a clip in the Project panel (or open a sequence), choose a language and click <em>Generate subtitles</em>. They arrive as a new caption track on the active sequence.</li>
            <li><strong>After Effects:</strong> select a footage layer in your comp and click <em>Generate subtitles</em>. Each line becomes a text layer, timed to the speech.</li>
            <li>Every clip you subtitle from the panel also appears in <a href="/app">Projects</a>, so you can fix lines and re-import.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
