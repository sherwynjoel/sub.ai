import Link from "next/link";
import Effects from "@/components/Effects";
import Hero3D from "@/components/Hero3D";
import LanguageDemo from "@/components/LanguageDemo";
import { BRAND } from "@/lib/brand";
import { PLANS, type PlanId } from "@/lib/plans";
import "./landing.css";

const MARQUEE = ["வணக்கம்", "Subtitles", "தமிழ்", "English", "Tanglish", "SRT", "VTT", "Premiere Pro", "After Effects", "டைமிங் சரியா இருக்கு", "Timed to the frame"];

const STEPS = [
  { title: "Drop your cut", body: "MP4, MOV, MKV or plain audio up to 4 GB, from the website or straight from your editor.", art: "upload" },
  { title: "Fix any line", body: "Tamil and English sit side by side with the video. Change a word, nudge a timing, save.", art: "edit" },
  { title: "Ship it", body: "Download SRT or VTT, or let the panel drop the captions onto your sequence.", art: "ship" },
];

const FEATURES = [
  { cls: "big", title: "Real Tamil script", body: "Colloquial dialogue stays colloquial. No broken transliteration, no machine-English Tamil.", demo: "இது நம்ம ஊரு தமிழ்." },
  { cls: "", title: "Tanglish? Handled.", body: "Code-mixed lines come out readable in both languages.", demo: "Bro, இது next level!" },
  { cls: "", title: "Frame-tight timing", body: "Every cue keeps the same timestamps in both languages." },
  { cls: "", title: "Every format", body: "SRT, WebVTT and TXT. Tamil, English, or both stacked." },
  { cls: "wide", title: "Lives in your editor", body: "A panel for Premiere Pro and After Effects. Select a clip, click once, captions land on the timeline." },
  { cls: "", title: "Your footage stays yours", body: "Videos are deleted automatically after 7 days." },
];

const FAQ = [
  ["Which languages can the video be in?", "Tamil, English, or a mix of both, including everyday Tanglish. You always get a Tamil subtitle file in Tamil script and an English one."],
  ["How accurate is it?", "Clear dialogue usually needs only a few fixes. Every line is editable side by side with the video before you download, and your edits are saved."],
  ["Which files can I export?", "SRT, WebVTT and plain text, in Tamil, English, or both languages stacked in one file."],
  ["Does it work inside Premiere Pro and After Effects?", "Yes. Install the panel, select a clip, and the subtitles come back as a caption track in Premiere Pro or as text layers in After Effects."],
  ["What happens to my footage?", "Your video is used only to make your subtitles. It's deleted from our servers automatically after 7 days, or right away when you delete the project."],
  ["Can I cancel anytime?", "Yes. Cancel from Billing; your plan and minutes stay active until the end of the month you paid for."],
];

const HEADLINE = ["Tamil", "+", "English", "subtitles.", "Done", "before", "your", "render."];

export default function Home() {
  return (
    <>
      <Effects />
      <div className="progress" aria-hidden="true" />
      <div className="cursor-glow" aria-hidden="true" />

      <header className="site-head-wrap">
        <div className="wrap site-head">
          <Link href="/" className="logo"><i />{BRAND.name}</Link>
          <nav aria-label="Main">
            <a href="#how" className="hide-sm">How it works</a>
            <a href="#features" className="hide-sm">Features</a>
            <a href="#pricing" className="hide-sm">Pricing</a>
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="btn small">Start free</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div className="hero-copy">
            <p className="pill-tag"><span className="dot" />AI subtitles for Tamil video editors</p>
            <h1 aria-label={HEADLINE.join(" ")}>
              {HEADLINE.map((w, i) => (
                <span key={i} className={`w${i === 2 || i === 3 ? " grad-text" : ""}`} style={{ "--i": i } as React.CSSProperties} aria-hidden="true">{w}</span>
              ))}
            </h1>
            <p className="lede">
              Upload a cut. {BRAND.name} listens to the dialogue and writes it in Tamil script and English, timed and ready
              to edit, download, or drop into Premiere Pro and After Effects.
            </p>
            <div className="ctas">
              <Link href="/signup" className="btn">Try 15 minutes free</Link>
              <a href="#demo" className="btn ghost">See it work</a>
            </div>
            <p className="muted small-print">No card needed. UPI accepted when you upgrade.</p>
          </div>
          <Hero3D />
        </section>

        <div className="marquee-clip" aria-hidden="true">
          <div className="marquee">
            <div className="marquee-track">
              {[...MARQUEE, ...MARQUEE].map((w, i) => <span key={i}>{w}</span>)}
            </div>
          </div>
        </div>

        <section className="section" id="how">
          <div className="wrap how" data-steps data-active="0">
            <div className="how-sticky">
              <h2 className="reveal">Three steps. That&apos;s it.</h2>
              <div className="how-art" aria-hidden="true">
                <div className="art art-upload"><span className="file">interview_A.mov</span><span className="bar"><i /></span></div>
                <div className="art art-edit"><span lang="ta">நீ சொன்னது உண்மைதானா?</span><span>Was it true?</span></div>
                <div className="art art-ship"><span>.srt</span><span>.vtt</span><span>Pr</span><span>Ae</span></div>
              </div>
            </div>
            <ol className="how-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} data-step={i} className="reveal">
                  <span className="num">0{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section" id="features">
          <div className="wrap">
            <h2 className="reveal">Made for how Tamil creators actually talk</h2>
            <div className="bento">
              {FEATURES.map((f, i) => (
                <article key={f.title} className={`tile tilt reveal ${f.cls}`} style={{ "--d": `${i * 0.06}s` } as React.CSSProperties}>
                  <h3>{f.title}</h3>
                  <p className="muted">{f.body}</p>
                  {f.demo && <p className="subtitle tile-sub" lang="ta">{f.demo}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="demo">
          <div className="wrap">
            <h2 className="reveal">One timing. Two languages.</h2>
            <p className="intro reveal">Switch between Tamil, English or both. The cues never drift apart, so you never re-sync.</p>
            <div className="reveal"><LanguageDemo /></div>
          </div>
        </section>

        <section className="section">
          <div className="wrap split">
            <div className="reveal">
              <h2>Right inside Premiere Pro and After Effects</h2>
              <p className="intro">
                Install the panel once and connect it with your key. Select a clip, choose Tamil, English or both, and click
                Generate. Premiere gets a caption track; After Effects gets timed text layers.
              </p>
              <Link href="/signup" className="btn ghost">Get the plugin</Link>
            </div>
            <div className="float-wrap reveal">
              <div className="mock-panel tilt" aria-hidden="true">
                <div className="bar"><span /><span /><span />{BRAND.name}</div>
                <div className="body">
                  <div className="row"><span>Clip</span><span className="pill">interview_A_cam.mov</span></div>
                  <div className="row"><span>Language</span><span className="pill">Tamil + English</span></div>
                  <div className="meter"><i /></div>
                  <div className="row"><span>Writing subtitles</span><span>72%</span></div>
                  <div className="go">Generate subtitles</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="wrap">
            <h2 className="reveal">Pick your plan</h2>
            <p className="intro reveal">Pay for the minutes of video you subtitle. Billed monthly in rupees through Razorpay, with UPI or card.</p>
            <div className="prices">
              {(Object.keys(PLANS) as PlanId[]).map((id, i) => {
                const p = PLANS[id];
                return (
                  <div key={id} className={`price tilt reveal${id === "pro" ? " featured" : ""}`} style={{ "--d": `${i * 0.08}s` } as React.CSSProperties}>
                    {id === "pro" && <span className="badge">Most picked</span>}
                    <h3>{p.name}</h3>
                    <div className="amt">
                      {p.priceInr ? `₹${p.priceInr.toLocaleString("en-IN")}` : "Free"}
                      {p.priceInr ? <small>/month</small> : null}
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
            <h2 className="reveal">Questions editors ask</h2>
            <div className="reveal">
              {FAQ.map(([q, a]) => (
                <details key={q}><summary>{q}</summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="final wrap reveal">
          <h2>Your next cut deserves <span className="grad-text">real Tamil subtitles.</span></h2>
          <Link href="/signup" className="btn">Start free, 15 minutes on us</Link>
        </section>
      </main>

      <footer className="wrap site-foot">
        <span className="logo"><i />{BRAND.name}</span>
        <span className="muted">Made in Tamil Nadu for editors everywhere. © 2026</span>
      </footer>
    </>
  );
}
