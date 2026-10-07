import Link from "next/link";
import Effects from "@/components/Effects";
import LanguageDemo from "@/components/LanguageDemo";
import ScreenBoard from "@/components/ScreenBoard";
import { BRAND } from "@/lib/brand";
import { PLANS, type PlanId } from "@/lib/plans";
import "./landing.css";

// Section addresses double as navigation, the way an editor jumps to a timecode.
const NAV = [
  ["#how", "00:12", "How it works"],
  ["#formats", "00:31", "What you get"],
  ["#plugin", "00:48", "Plugin"],
  ["#pricing", "01:05", "Pricing"],
] as const;

const STEPS = [
  { ta: "பதிவேற்று", en: "Upload", body: "Drop an MP4, MOV, MKV or audio file up to 4 GB, from the website or from inside your editor.", strip: ["Step 1", "Up to 4 GB"] },
  { ta: "திருத்து", en: "Fix", body: "Tamil and English sit side by side with the video. Change a word or nudge a timing, then save.", strip: ["Step 2", "Side by side"] },
  { ta: "அனுப்பு", en: "Ship", body: "Download SRT or VTT, or let the panel lay the captions on your sequence.", strip: ["Step 3", "SRT, VTT, TXT"] },
];

const RATES = [
  ["Tamil script", "Colloquial Tamil stays colloquial, in proper Tamil script"],
  ["Tanglish", "Code-mixed lines come out readable in both languages"],
  ["One timing", "Tamil and English share every timestamp"],
  ["Formats", "SRT, WebVTT and plain text, per language or stacked"],
  ["Your editor", "Caption track in Premiere Pro, text layers in After Effects"],
  ["Privacy", "Videos are deleted automatically after 7 days"],
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
      <header className="street-head">
        <div className="wrap site-head">
          <Link href="/" className="logo"><i />{BRAND.name}</Link>
          <nav aria-label="Main">
            {NAV.map(([href, t, label]) => (
              <a key={href} href={href} className="hide-sm"><span className="tc addr">{t}</span>{label}</a>
            ))}
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="btn small">Start free</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* First viewport: the banner street at night */}
        <section className="street">
          <div className="street-scene">
            <div className="rig">
              <article className="board offer-board">
                <span className="lamp" aria-hidden="true" />
                <h1><span className="h1-lead">Tamil and English subtitles,</span> <span className="h1-big">painted on your timeline.</span></h1>
                <p className="offer-copy">Upload a cut, fix a few lines, and drop SRT or captions into Premiere Pro.</p>
                <div className="offer-actions">
                  <Link href="/signup" className="btn">Start free, 15 minutes</Link>
                  <a href="#how" className="offer-link">See how it works</a>
                </div>
                <div className="strip"><span>No card needed</span><span>UPI and cards when you upgrade</span></div>
                <span className="legs" aria-hidden="true" />
              </article>
              <div className="screen-wrap">
                <span className="lamp" aria-hidden="true" />
                <ScreenBoard />
                <span className="legs" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="ground" aria-hidden="true" />
        </section>

        <section className="section" id="how">
          <div className="wrap">
            <h2 className="sec-title"><span className="tc addr">00:12</span> Three steps from cut to captions</h2>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.en} className="board step-board hoist" style={{ "--d": `${i * 0.12}s` } as React.CSSProperties}>
                  <span className="lamp" aria-hidden="true" />
                  <span className="step-ta" lang="ta">{s.ta}</span>
                  <h3>{s.en}</h3>
                  <p>{s.body}</p>
                  <div className="strip">{s.strip.map((x) => <span key={x}>{x}</span>)}</div>
                  <span className="legs short" aria-hidden="true" />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section" id="formats">
          <div className="wrap">
            <div className="board rate-board hoist">
              <span className="lamp" aria-hidden="true" />
              <h2><span className="tc addr">00:31</span> What you get</h2>
              <dl className="rates">
                {RATES.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              <div className="strip"><span>Every plan</span><span>Tamil + English</span></div>
              <span className="legs short" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="section" id="demo">
          <div className="wrap">
            <h2 className="sec-title">One timing, two languages</h2>
            <p className="sec-lede">Switch the view between Tamil, English or both. The cues never drift apart, so you never re-sync.</p>
            <div className="board demo-board hoist">
              <span className="lamp" aria-hidden="true" />
              <LanguageDemo />
              <div className="strip"><span>Sample dialogue</span><span>Same timing in both languages</span></div>
              <span className="legs short" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="interval" aria-label="Interval">
          <div className="wrap interval-inner hoist">
            <span className="interval-ta" lang="ta">இடைவேளை</span>
            <p>Interval. Your first 15 minutes are free; pick a plan when you need more.</p>
          </div>
        </section>

        <section className="section" id="plugin">
          <div className="wrap">
            <div className="board plugin-board hoist">
              <span className="lamp" aria-hidden="true" />
              <div>
                <h2><span className="tc addr">00:48</span> Right inside Premiere Pro and After Effects</h2>
                <p>
                  Install the panel once and connect it with your key. Select a clip, choose Tamil, English or both, and click
                  Generate. Premiere gets a caption track; After Effects gets timed text layers.
                </p>
                <Link href="/signup" className="btn">Get the plugin</Link>
                <div className="strip"><span>Premiere Pro 2022+</span><span>After Effects 2022+</span><span>Windows and macOS</span></div>
              </div>
              <div className="mock-panel" aria-hidden="true">
                <div className="bar">{BRAND.name}</div>
                <div className="body">
                  <div className="row"><span>Clip</span><span className="pill">interview_A_cam.mov</span></div>
                  <div className="row"><span>Language</span><span className="pill">Tamil + English</span></div>
                  <div className="meter"><i /></div>
                  <div className="row"><span>Writing subtitles</span><span className="tc">72%</span></div>
                  <div className="go">Generate subtitles</div>
                </div>
              </div>
              <span className="legs short" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="wrap">
            <h2 className="sec-title"><span className="tc addr">01:05</span> Pick a plan</h2>
            <p className="sec-lede">Pay for the minutes of video you subtitle. Billed monthly in rupees through Razorpay, with UPI or card.</p>
            <div className="tickets">
              {(Object.keys(PLANS) as PlanId[]).map((id, i) => {
                const p = PLANS[id];
                return (
                  <div key={id} className={`ticket hoist${id === "pro" ? " featured" : ""}`} style={{ "--d": `${i * 0.08}s` } as React.CSSProperties}>
                    <div className="ticket-main">
                      <h3>{p.name}</h3>
                      <div className="amt">{p.priceInr ? `₹${p.priceInr.toLocaleString("en-IN")}` : "Free"}{p.priceInr ? <small>a month</small> : null}</div>
                      <p>{p.blurb}</p>
                      <ul>
                        <li>{p.minutes.toLocaleString("en-IN")} minutes of video{id === "free" ? ", once" : " a month"}</li>
                        <li>Tamil and English SRT, VTT, TXT</li>
                        <li>Premiere Pro and After Effects panel</li>
                      </ul>
                    </div>
                    <div className="ticket-stub">
                      <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`} className={`btn${id === "pro" ? "" : " ghost"}`}>
                        {id === "free" ? "Start free" : `Choose ${p.name}`}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {PROOF.length > 0 && (
          <section className="section" id="proof">
            <div className="wrap">
              <h2 className="sec-title">Editors on the street</h2>
              <div className="proof">
                {PROOF.map((p) => (
                  <figure key={p.name} className="board proof-board hoist">
                    <blockquote>{p.quote}</blockquote>
                    <figcaption className="strip"><span>{p.name}</span><span>{p.work}</span></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section faq">
          <div className="wrap faq-grid">
            <h2 className="sec-title">Questions editors ask</h2>
            <div className="board faq-board">
              {FAQ.map(([q, a]) => (
                <details key={q}><summary>{q}</summary><p>{a}</p></details>
              ))}
              <div className="strip"><span>Notice board</span><span>More questions: write to us after you sign up</span></div>
            </div>
          </div>
        </section>

        <section className="section final">
          <div className="wrap">
            <div className="board final-board hoist">
              <span className="lamp" aria-hidden="true" />
              <h2><span className="h1-lead">Your next cut,</span> <span className="h1-big">subtitled tonight.</span></h2>
              <Link href="/signup" className="btn">Start free, 15 minutes</Link>
              <div className="strip"><span>15 minutes free</span><span>No card needed</span></div>
              <span className="legs short" aria-hidden="true" />
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap site-foot">
        <span className="logo"><i />{BRAND.name}</span>
        <span className="muted">Made in Tamil Nadu for editors everywhere. © 2026</span>
      </footer>
    </>
  );
}
