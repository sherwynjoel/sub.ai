import Link from "next/link";
import CardStack from "@/components/CardStack";
import Effects from "@/components/Effects";
import { BRAND } from "@/lib/brand";
import { PLANS, type PlanId } from "@/lib/plans";
import "./landing.css";

const STEPS = [
  ["Upload", "Drop your cut, up to 4 GB."],
  ["Fix", "Tamil and English, side by side."],
  ["Export", "SRT, VTT, or straight to Premiere."],
];

// Real proof only. Add the user's own testimonials here; the section stays hidden while this is empty.
const PROOF: { quote: string; name: string; work: string }[] = [];

export default function Home() {
  return (
    <>
      <Effects />
      <section className="hero">
        <header className="wrap site-head">
          <Link href="/" className="logo"><i />{BRAND.name}</Link>
          <nav aria-label="Main">
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="btn small">Start free</Link>
          </nav>
        </header>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>Subtitles, in Tamil and English.</h1>
            <p className="lede">Upload a cut. Get both languages, timed.</p>
            <Link href="/signup" className="btn">Try 15 minutes free</Link>
            <p className="note">No card needed.</p>
          </div>
          <CardStack />
        </div>
      </section>

      <main>
        <div className="flow">
        <section className="steps wrap" aria-label="How it works">
          {STEPS.map(([title, line], i) => (
            <div key={title} className="step flip" style={{ "--d": `${i * 0.14}s` } as React.CSSProperties}>
              <span className="step-n">{i + 1}</span>
              <div><h3>{title}</h3><p>{line}</p></div>
            </div>
          ))}
        </section>

        <section className="plugin wrap">
          <div className="plugin-copy">
            <h2>Works inside Premiere Pro & After Effects.</h2>
            <Link href="/signup" className="btn ghost">Get the plugin</Link>
          </div>
          <div className="panel-tilt" aria-hidden="true">
            <div className="mini-panel">
              <div className="mp-bar">{BRAND.name}</div>
              <div className="mp-row"><span>Clip</span><b>interview_A.mov</b></div>
              <div className="mp-row"><span>Language</span><b>Tamil + English</b></div>
              <span className="mp-track"><i /></span>
              <span className="mp-go">Generate subtitles</span>
            </div>
          </div>
        </section>
        </div>

        {PROOF.length > 0 && (
          <section className="proof wrap">
            {PROOF.map((p) => (
              <figure key={p.name} className="flip"><blockquote>{p.quote}</blockquote><figcaption>{p.name}, {p.work}</figcaption></figure>
            ))}
          </section>
        )}

        <div className="pricing-band">
        <section className="pricing wrap" id="pricing">
          <h2>Simple plans.</h2>
          <div className="plans">
            {(Object.keys(PLANS) as PlanId[]).map((id) => {
              const p = PLANS[id];
              return (
                <div key={id} className={`plan${id === "pro" ? " hot" : ""}`}>
                  <h3>{p.name}</h3>
                  <div className="price">{p.priceInr ? `₹${p.priceInr.toLocaleString("en-IN")}` : "Free"}{p.priceInr ? <small>/mo</small> : null}</div>
                  <p>{p.minutes.toLocaleString("en-IN")} minutes{id === "free" ? ", once" : " a month"}</p>
                  <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`} className={`btn small${id === "pro" ? "" : " ghost"}`}>
                    {id === "free" ? "Start free" : "Choose"}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
        </div>
      </main>

      <footer className="foot">
        <div className="wrap foot-inner">
          <span className="logo"><i />{BRAND.name}</span>
          <span>© 2026 {BRAND.name}</span>
          <Link href="/signup">Start free</Link>
        </div>
      </footer>
    </>
  );
}
