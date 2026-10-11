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
          <p className="muted small">For styled text in After Effects, also install the <a href="/downloads/vasanam-fonts.zip">caption fonts (zip)</a>. Premiere styles its captions in the Essential Graphics panel.</p>
        </section>
        <section className="panel">
          <h2>2. Connect</h2>
          <p>Paste this key into the panel once. Keep it private.</p>
          <ApiKeyBox hint={u.apiKeyHint} />
        </section>
        <section className="panel wide">
          <h2>3. Generate</h2>
          <p className="muted">Select a clip, pick a language, click <em>Generate subtitles</em>. Premiere gets a caption track; After Effects gets text layers. Then edit the text, style, font, colours, position and lines right in the panel and place them again.</p>
        </section>
        <section className="panel wide">
          <h2>DaVinci Resolve</h2>
          <p>Resolve 18 or newer, free or Studio, Windows or macOS. Uses the same key and minutes.</p>
          <a className="btn" href="/api/plugin/resolve" download>Download script (.lua)</a>
          <ol className="howto">
            <li>Put <code>Vasanam.lua</code> in the Scripts folder:<br />
              Windows: <code>%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility</code><br />
              macOS: <code>~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility</code></li>
            <li>Restart Resolve, then open <strong>Workspace → Scripts → Vasanam</strong> and paste your key.</li>
            <li>Put the playhead over a clip and click <em>Subtitle the clip under the playhead</em>. The subtitles land on a subtitle track, lined up with the clip.</li>
          </ol>
        </section>
      </div>
    </>
  );
}
