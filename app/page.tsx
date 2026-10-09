import Link from "next/link";
import Effects from "@/components/Effects";
import ProductShot from "@/components/ProductShot";
import StoryScroll from "@/components/StoryScroll";
import { BRAND } from "@/lib/brand";
import { PLANS, type PlanId } from "@/lib/plans";
import "./landing.css";

const FACTS = [
  ["Colloquial Tamil", "Spoken Tamil stays spoken Tamil, written in proper Tamil script."],
  ["Tanglish", "Code-mixed lines come out readable in both languages."],
  ["One timing", "Tamil and English share every timestamp, so nothing drifts."],
];

const FORMATS = [
  ["SRT", "Premiere Pro, Resolve, YouTube"],
  ["WebVTT", "Web players and HTML5 video"],
  ["Plain text", "Scripts, captions, show notes"],
  ["Caption track", "Straight onto your Premiere sequence"],
];

// Real proof only. Add the user's own testimonials here; the section stays hidden while this is empty.
const PROOF: { quote: string; name: string; work: string }[] = [];

const FAQ = [
  ["Which languages can the video be in?", "Tamil, English, or a mix of both, including everyday Tanglish. You always get a Tamil subtitle file in Tamil script and an English one."],
  ["How accurate is it?", "Clear dialogue usually needs only a few fixes. Every line is editable side by side with the video before you download, and your edits are saved."],
  ["Which files can I export?", "SRT, WebVTT and plain text, in Tamil, English, or both languages stacked in one file."],
  ["Does it work inside Premiere Pro and After Effects?", "Yes. Install the panel, select a clip, and the subtitles come back as a caption track in Premiere Pro or as text layers in After Effects."],
  ["What happens to my footage?", "Your video is used only to make your subtitles. It's deleted from our servers automatically after 7 days, or right away when you delete the project."],
  ["Can I cancel anytime?", "Yes. Cancel from Billing; your plan and minutes stay active until the end of the month you paid for."],
];

export default function Home() {
  return (
    <>
      <Effects />
      <header className="top">
        <div className="wrap site-head">
          <Link href="/" className="logo"><i />{BRAND.name}</Link>
          <nav aria-label="Main">
            <a href="#how" className="hide-sm">How it works</a>
            <a href="#plugin" className="hide-sm">Plugin</a>
            <a href="#pricing" className="hide-sm">Pricing</a>
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="btn small">Start free</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-copy">
            <h1>Tamil and English subtitles. In minutes.</h1>
            <p className="lede">Upload a cut and get every line of dialogue in Tamil script and English, timed and ready for your timeline.</p>
            <div className="hero-actions">
              <Link href="/signup" className="btn">Start free</Link>
              <a href="#how" className="link-arrow">See how it works<svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1.5L6 6l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              <span className="note">15 minutes free. No card needed.</span>
            </div>
          </div>
          <div className="shot-stage">
            <ProductShot />
          </div>
        </section>

        <section className="section tamil">
          <div className="wrap">
            <h2 className="reveal">Made for the way Tamil is actually spoken.</h2>
            <figure className="specimen reveal">
              <p className="spec-ta" lang="ta">அப்போ நாளைக்கு எல்லார் முன்னாடியும் சொல்லு.</p>
              <p className="spec-en">Then say it tomorrow, in front of everyone.</p>
              <figcaption className="spec-time tc"><span>00:01:18,900</span><span className="rule" /><span>00:01:22,100</span></figcaption>
            </figure>
            <dl className="facts reveal">
              {FACTS.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <section className="section how" id="how">
          <div className="wrap">
            <h2 className="reveal">From cut to captions in four steps.</h2>
            <StoryScroll />
          </div>
        </section>

        <section className="section plugin" id="plugin">
          <div className="wrap plugin-grid">
            <div className="reveal">
              <h2>Right inside Premiere Pro and After Effects.</h2>
              <p className="lede">
                Install the panel once and connect it with your key. Select a clip, choose Tamil, English or both, and click
                Generate. Premiere gets a caption track; After Effects gets timed text layers.
              </p>
              <dl className="formats">
                {FORMATS.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              <Link href="/signup" className="btn ghost">Get the plugin</Link>
            </div>
            <div className="pr-window reveal" aria-hidden="true">
              <div className="shot-bar">
                <span className="dots"><i /><i /><i /></span>
                <span className="shot-title">Premiere Pro — Sequence 01</span>
              </div>
              <div className="pr-body">
                <div className="pr-monitor">
                  <span className="shot-tag">Program</span>
                  <div className="subtitle pr-caption">
                    <span lang="ta">நீ சொன்னது எல்லாம் உண்மைதானா?</span>
                    <span className="en">Was everything you said true?</span>
                  </div>
                </div>
                <div className="panel-shot">
                  <div className="ps-bar"><span>{BRAND.name}</span></div>
                  <div className="ps-body">
                    <div className="ps-row"><span>Clip</span><span className="ps-pill">interview_A_cam.mov</span></div>
                    <div className="ps-row"><span>Subtitles in</span><span className="ps-pill">Tamil + English</span></div>
                    <span className="ps-bar-track"><i /></span>
                    <div className="ps-row"><span>Writing subtitles</span><span className="tc">72%</span></div>
                    <span className="ps-go">Generate subtitles</span>
                  </div>
                </div>
              </div>
              <div className="pr-track">
                <span className="pr-lane">V1</span><span className="pr-clip video" />
                <span className="pr-lane">C1</span><span className="pr-clip caps"><i /><i /><i /><i /></span>
              </div>
            </div>
          </div>
        </section>

        {PROOF.length > 0 && (
          <section className="section proof">
            <div className="wrap">
              <h2 className="reveal">Editors who switched.</h2>
              <div className="proof-grid">
                {PROOF.map((p) => (
                  <figure key={p.name} className="reveal">
                    <blockquote>{p.quote}</blockquote>
                    <figcaption><b>{p.name}</b><span>{p.work}</span></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section pricing" id="pricing">
          <div className="wrap">
            <h2 className="reveal">Simple monthly plans.</h2>
            <p className="lede reveal">Pay for the minutes of video you subtitle. Billed monthly in rupees through Razorpay, with UPI or card.</p>
            <div className="plans reveal">
              {(Object.keys(PLANS) as PlanId[]).map((id) => {
                const p = PLANS[id];
                return (
                  <div key={id} className={`plan-col${id === "pro" ? " featured" : ""}`}>
                    <h3>{p.name}</h3>
                    <p className="plan-blurb">{p.blurb}</p>
                    <div className="plan-price">
                      {p.priceInr ? `₹${p.priceInr.toLocaleString("en-IN")}` : "Free"}
                      {p.priceInr ? <span>/month</span> : null}
                    </div>
                    <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`} className={`btn${id === "pro" ? "" : " ghost"}`}>
                      {id === "free" ? "Start free" : `Choose ${p.name}`}
                    </Link>
                    <ul>
                      <li>{p.minutes.toLocaleString("en-IN")} minutes of video{id === "free" ? ", once" : " a month"}</li>
                      <li>Tamil and English subtitles</li>
                      <li>SRT, VTT and text export</li>
                      <li>Premiere Pro and After Effects panel</li>
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section faq">
          <div className="wrap faq-grid">
            <h2 className="reveal">Questions.</h2>
            <div className="faq-list reveal">
              {FAQ.map(([q, a]) => (
                <details key={q}><summary>{q}</summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="final">
          <div className="wrap final-inner reveal">
            <h2>Your next cut, subtitled tonight.</h2>
            <Link href="/signup" className="btn">Start free</Link>
            <p className="note">15 minutes free. No card needed.</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-inner">
          <span className="logo"><i />{BRAND.name}</span>
          <span className="muted">Made in Tamil Nadu for editors everywhere. © 2026</span>
        </div>
      </footer>
    </>
  );
}
