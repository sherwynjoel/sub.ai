import Link from "next/link";
import Hero3D from "@/components/Hero3D";
import { BRAND } from "@/lib/brand";
import { PLANS, type PlanId } from "@/lib/plans";
import "./landing.css";

const SAMPLE = [
  ["00:01:12,400", "நீ சொன்னது எல்லாம் உண்மைதானா?", "Was everything you said true?"],
  ["00:01:15,050", "சத்தியமா, ஒரு வார்த்தை கூட பொய் இல்லை.", "I swear, not a single word was a lie."],
  ["00:01:18,900", "அப்போ நாளைக்கு எல்லார் முன்னாடியும் சொல்லு.", "Then say it tomorrow, in front of everyone."],
];

const FAQ = [
  ["Which languages can the video be in?", "Tamil, English, or a mix of both, including everyday Tanglish. You always get a Tamil subtitle file in Tamil script and an English one."],
  ["How accurate is it?", "Clear dialogue usually needs only a few fixes. Every line is editable side by side with the video before you download, and your edits are saved."],
  ["Which files can I export?", "SRT, WebVTT and plain text, in Tamil, English, or both languages stacked in one file."],
  ["Does it work inside Premiere Pro and After Effects?", "Yes. Install the panel, select a clip, and the subtitles come back as a caption track in Premiere Pro or as text layers in After Effects."],
  ["What happens to my footage?", "Your video is used only to make your subtitles. It is deleted from our servers automatically after 7 days, or right away when you delete the project."],
  ["Can I cancel anytime?", "Yes. Cancel from Billing; your plan and minutes stay active until the end of the month you paid for."],
];

export default function Home() {
  return (
    <>
      <header className="wrap site-head">
        <Link href="/" className="logo"><i />{BRAND.name}</Link>
        <nav aria-label="Main">
          <a href="#how" className="hide-sm">How it works</a>
          <a href="#plugin" className="hide-sm">Plugin</a>
          <a href="#pricing" className="hide-sm">Pricing</a>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="btn small">Start free</Link>
        </nav>
      </header>

      <main>
        <section className="wrap hero">
          <div>
            <h1>Tamil and English subtitles, timed for your timeline.</h1>
            <p className="lede">
              Upload a cut. {BRAND.name} listens to the dialogue, writes it in Tamil script and in English, and gives you
              subtitle files to edit, download, or import straight into Premiere Pro and After Effects.
            </p>
            <div className="ctas">
              <Link href="/signup" className="btn">Try 15 minutes free</Link>
              <a href="#pricing" className="btn ghost">See pricing</a>
            </div>
            <p className="muted">No card needed for the trial.</p>
          </div>
          <Hero3D />
        </section>

        <section className="section" id="how">
          <div className="wrap">
            <h2>From upload to timeline in three steps</h2>
            <ol className="steps">
              <li><h3>Upload your video</h3><p className="muted">Drop in an MP4, MOV, MKV or audio file up to 4 GB, from the website or from inside your editor.</p></li>
              <li><h3>Review each line</h3><p className="muted">Tamil and English sit side by side with the video. Fix a word or nudge a timing, then save.</p></li>
              <li><h3>Export or import</h3><p className="muted">Download SRT or VTT, or let the plugin place the captions on your sequence.</p></li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <h2>Both languages, cue for cue</h2>
            <p className="intro">Every subtitle carries the same timing in Tamil and English, so you can switch languages without re-syncing.</p>
            <div className="sample panel">
              <table>
                <thead><tr><th>Time</th><th lang="ta">தமிழ்</th><th>English</th></tr></thead>
                <tbody>
                  {SAMPLE.map(([t, ta, en]) => (
                    <tr key={t}><td>{t}</td><td lang="ta">{ta}</td><td>{en}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section" id="plugin">
          <div className="wrap split">
            <div>
              <h2>Right inside Premiere Pro and After Effects</h2>
              <p className="intro">
                Install the {BRAND.name} panel once and connect it with your key. Select a clip, choose Tamil, English or both,
                and click Generate. In Premiere Pro the subtitles arrive as a caption track; in After Effects, as text layers
                timed to the comp.
              </p>
              <Link href="/signup" className="btn ghost">Get the plugin</Link>
            </div>
            <div className="mock-panel" aria-hidden="true">
              <div className="bar">{BRAND.name}</div>
              <div className="body">
                <div className="row"><span>Clip</span><span className="pill">interview_A_cam.mov</span></div>
                <div className="row"><span>Language</span><span className="pill">Tamil + English</span></div>
                <div className="meter"><i /></div>
                <div className="row"><span>Transcribing</span><span>72%</span></div>
                <div className="go">Generate subtitles</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="wrap">
            <h2>Simple monthly plans</h2>
            <p className="intro">Pay for the minutes of video you subtitle. Prices in rupees, billed monthly through Razorpay with UPI or card.</p>
            <div className="prices">
              {(Object.keys(PLANS) as PlanId[]).map((id) => {
                const p = PLANS[id];
                return (
                  <div key={id} className={`price${id === "pro" ? " featured" : ""}`}>
                    <h3>{p.name}</h3>
                    <div className="amt">
                      {p.priceInr ? `₹${p.priceInr.toLocaleString("en-IN")}` : "Free"}
                      {p.priceInr ? <small> / month</small> : null}
                    </div>
                    <p className="muted">{p.blurb}</p>
                    <ul>
                      <li>{p.minutes.toLocaleString("en-IN")} minutes of video{id === "free" ? ", once" : " a month"}</li>
                      <li>Tamil and English SRT, VTT, TXT</li>
                      <li>Premiere Pro and After Effects panel</li>
                    </ul>
                    <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`} className={`btn${id === "pro" ? "" : " ghost"}`}>
                      {id === "free" ? "Start free" : `Choose ${p.name}`}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section faq">
          <div className="wrap">
            <h2>Questions editors ask</h2>
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>
      </main>

      <footer className="wrap site-foot">
        <span>© 2026 {BRAND.name}</span>
        <span>Made in Tamil Nadu for editors everywhere.</span>
      </footer>
    </>
  );
}
