"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Cube from "@/components/Cube";
import Effects from "@/components/Effects";
import HeroEditor from "@/components/HeroEditor";
import StyleShowcase from "@/components/StyleShowcase";
import { CAPTION_STYLES } from "@/lib/captionStyles";
import { BRAND } from "@/lib/brand";
import { LANGUAGES } from "@/lib/languages";
import { PLANS, type PlanId } from "@/lib/plans";

// The hero headline names a language in its own script; the chip above greets in the same language.
const HELLO = [
  { n: "தமிழ்", w: "வணக்கம்", l: "Tamil", lang: "ta" },
  { n: "हिन्दी", w: "नमस्ते", l: "Hindi", lang: "hi" },
  { n: "తెలుగు", w: "నమస్కారం", l: "Telugu", lang: "te" },
  { n: "മലയാളം", w: "നമസ്കാരം", l: "Malayalam", lang: "ml" },
  { n: "ಕನ್ನಡ", w: "ನಮಸ್ಕಾರ", l: "Kannada", lang: "kn" },
  { n: "বাংলা", w: "নমস্কার", l: "Bengali", lang: "bn" },
  { n: "मराठी", w: "नमस्कार", l: "Marathi", lang: "mr" },
  { n: "ગુજરાતી", w: "નમસ્તે", l: "Gujarati", lang: "gu" },
  { n: "ਪੰਜਾਬੀ", w: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", l: "Punjabi", lang: "pa" },
];

const t = {
  nav: ["Features", "How it works", "Pricing"], signIn: "Sign in", start: "Start free", startShort: "Start",
  h1: ["Subtitles that ", "actually speak"],
  lede: "Drop your cut. Get Tamil, or any of 22 Indian languages, plus English on one timeline, code-mix and all. Fix any line, export, get back to editing.",
  cta: "Start free · 15 min", how: "See how it works", note: "No card. No setup.",
  live: "Live",
  langs: `${LANGUAGES.length} Indian languages, each paired with English. All live.`,
  featuresH: ["Made for how we ", "really talk", "."],
  features: [
    ["Real Tamil, real script", "Spoken lines stay spoken. Tanglish stays Tanglish. Nothing gets turned into textbook Tamil."],
    ["One timeline, two languages", "Tamil and English share every timestamp, so switching tracks never drifts."],
    ["Fix it while it plays", "Tap a line, change a word, nudge the timing. Export again in a second."],
    ["Every format", "SRT, VTT, plain text, or a caption track straight onto your sequence."],
  ],
  pluginH: "Lives right inside Premiere Pro and After Effects.",
  pluginP: "Pick a clip and its language, hit Generate. Premiere gets a caption track; After Effects gets timed text layers.",
  pluginBtn: "Get the plugin",
  stepsH: "Cut to captions in three moves.",
  steps: [
    ["Upload", "Drop any cut up to 4 GB, from the browser or right from Premiere."],
    ["Review", "Tamil and English side by side with your video. Fix anything."],
    ["Export", "SRT, VTT, text, or straight onto your timeline."],
  ],
  priceH: "Pay for minutes, not features.",
  priceP: "Monthly, in rupees, through Razorpay with UPI or card. Every plan gets the Premiere panel.",
  free: "Free", perMonth: "/month",
  blurb: { free: PLANS.free.blurb, creator: PLANS.creator.blurb, pro: PLANS.pro.blurb, studio: PLANS.studio.blurb } as Record<PlanId, string>,
  mins: (n: string, once: boolean) => `${n} minutes${once ? ", once" : " a month"}`,
  perks: [`${LANGUAGES.length} Indian languages + English`, `${CAPTION_STYLES.length} caption styles, styled MP4 export`, "SRT, VTT and text export", "Premiere & After Effects panel"],
  choose: (name: string) => `Choose ${name}`,
  faqH: "Quick answers",
  faq: [
    ["Which languages work?", `Tamil, Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi and ${LANGUAGES.length - 7} more Indian languages, each with English on the same timing. Pick the language when you upload.`],
    ["Does it get Tanglish?", "Yes. Mixed dialogue stays as spoken: Tamil words in Tamil script, English words in English."],
    ["How long can a video be?", "Uploads go up to 4 GB. Minutes come out of your plan, and the free trial has 15 minutes once."],
    ["Do I need a card to try it?", "No. Sign up and use the 15 trial minutes. Pay only when you pick a monthly plan."],
    ["How do I pay and cancel?", "Monthly in rupees through Razorpay, with UPI or card. Cancel from Billing any time; your minutes stay until the period ends."],
  ],
  ctaH: "Your next cut gets subtitles tonight.",
  works: "Exports for",
};

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/** The landing page: English copy with Tamil dialogue samples and a multilingual greeting strip. */
export default function Landing() {
  const [hi, setHi] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setHi((n) => (n + 1) % HELLO.length), 2400);
    return () => clearInterval(id);
  }, []);


  const hello = HELLO[hi];
  return (
    <>
      <Effects />
      <header className="wrap top">
        <div className="site-bar">
          <div className="site-head">
            <Link href="/" className="logo"><i />{BRAND.name}</Link>
            <nav aria-label="Main">
              <a href="#features" className="hide-sm">{t.nav[0]}</a>
              <a href="#styles" className="hide-sm">Styles</a>
              <a href="#how" className="hide-sm">{t.nav[1]}</a>
              <a href="#pricing" className="hide-sm">{t.nav[2]}</a>
              <Link href="/login" className="hide-xs">{t.signIn}</Link>
              <Link href="/signup" className="btn small"><span className="start-long">{t.start}</span><span className="start-short">{t.startShort}</span></Link>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <p className="hello glass" aria-hidden="true">
            <span key={hi} className="hello-word" lang={hello.lang}>{hello.w}</span>
            <span className="hello-lang">{hello.l}</span>
          </p>
          <h1>
            {t.h1[0]}<span className="mark">{t.h1[1]}</span>{" "}
            <span className="sr-only">Tamil, Hindi, Telugu, Malayalam, Kannada and more.</span>
            <span key={hi} className="lang-word" lang={hello.lang} aria-hidden="true">{hello.n}</span>
          </h1>
          <p className="lede">{t.lede}</p>
          <div className="cta">
            <Link href="/signup" className="btn">{t.cta}</Link>
            <a href="#how" className="btn ghost">{t.how}</a>
          </div>
          <p className="note">{t.note}</p>
        </section>
        <div className="wrap"><HeroEditor /></div>

        <section className="langs" aria-label={t.langs}>
          <p className="wrap langs-title rise">{t.langs}</p>
          <div className="langs-strip">
            <div className="langs-track">
              {[...LANGUAGES, ...LANGUAGES].map((l, i) => (
                <span key={i} className="lang-chip glass live" aria-hidden={i >= LANGUAGES.length || undefined}>
                  <b>{l.native}</b><small>{l.name}</small><em>{t.live}</em>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap sec" id="features">
          <h2 className="rise">{t.featuresH[0]}<span className="mark">{t.featuresH[1]}</span>{t.featuresH[2]}</h2>
          <div className="bento">
            <article className="tile glass shine big rise">
              <h3>{t.features[0][0]}</h3>
              <p>{t.features[0][1]}</p>
              <div className="examples">
                <div><b lang="ta">Bro, இது next level!</b><span lang="en">Bro, this is next level!</span></div>
                <div><b lang="ta">சத்தியமா, பொய் இல்லை.</b><span lang="en">I swear, it&apos;s not a lie.</span></div>
                <div><b lang="ta">மறக்காம page-அ follow பண்ணுங்க.</b><span lang="en">Don&apos;t forget to follow the page.</span></div>
                <div><b lang="ta">Machi, இந்த edit semma!</b><span lang="en">Dude, this edit is awesome!</span></div>
                <div><b lang="ta">நாளைக்கு client-க்கு deliver பண்ணணும்.</b><span lang="en">We have to deliver to the client tomorrow.</span></div>
              </div>
            </article>
            <article className="tile glass shine rise" style={d(0.06)}>
              <h3>{t.features[1][0]}</h3>
              <p>{t.features[1][1]}</p>
              <div className="lanes" aria-hidden="true">
                <span>TA</span><i><b style={{ left: "4%", width: "28%" }} /><b style={{ left: "38%", width: "22%" }} /><b style={{ left: "66%", width: "30%" }} /></i>
                <span>EN</span><i><b style={{ left: "4%", width: "28%" }} /><b style={{ left: "38%", width: "22%" }} /><b style={{ left: "66%", width: "30%" }} /></i>
              </div>
            </article>
            <article className="tile glass shine rise" style={d(0.12)}>
              <h3>{t.features[2][0]}</h3>
              <p>{t.features[2][1]}</p>
              <div className="edit-demo" aria-hidden="true"><span className="tc">00:01:15,050</span><b lang="ta">சத்தியமா, பொய் இல்லை<i className="caret" /></b></div>
            </article>
            <article className="tile glass shine wide rise" style={d(0.18)}>
              <div>
                <h3>{t.features[3][0]}</h3>
                <p>{t.features[3][1]}</p>
              </div>
              <Cube />
            </article>
          </div>
        </section>

        <section className="wrap sec" id="styles">
          <h2 className="rise">{CAPTION_STYLES.length} looks. <span className="mark">One tap.</span></h2>
          <p className="sec-lede rise">Pick a style in the editor, watch it on your clip, then download a finished MP4 with the captions burned in. Every style works in every language.</p>
          <StyleShowcase />
        </section>

        <section className="wrap sec split" id="plugin">
          <div className="rise">
            <h2>{t.pluginH}</h2>
            <p className="lede">{t.pluginP}</p>
            <Link href="/signup" className="btn ghost">{t.pluginBtn}</Link>
          </div>
          <div className="pr-window tilt rise" aria-hidden="true">
            <div className="pr-bar"><span className="dots"><i /><i /><i /></span>Premiere Pro — Sequence 01</div>
            <div className="pr-body">
              <div className="pr-monitor">
                <div className="subtitle pr-cap"><span lang="ta">நீ சொன்னது உண்மையா?</span><small className="en">Was it true?</small></div>
              </div>
              <div className="pr-panel">
                <span className="pr-title">{BRAND.name}</span>
                <div className="pr-row"><span>Clip</span><b>interview_A.mov</b></div>
                <div className="pr-row"><span>Subtitles in</span><b>Tamil + English</b></div>
                <span className="pr-meter"><i /></span>
                <span className="pr-go">Generate subtitles</span>
              </div>
            </div>
            <div className="pr-tracks"><span>V1</span><i className="v" /><span>C1</span><i className="c"><b /><b /><b /><b /></i></div>
          </div>
        </section>

        <section className="wrap sec" id="how">
          <h2 className="rise">{t.stepsH}</h2>
          <ol className="steps" data-scroll>
            {t.steps.map(([h, p], n) => (
              <li key={n} className="glass shine rise" style={d(n * 0.1)}>
                <span className="step-n">0{n + 1}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="wrap sec" id="pricing">
          <h2 className="rise">{t.priceH}</h2>
          <p className="sec-lede rise">{t.priceP}</p>
          <div className="plans">
            {(Object.keys(PLANS) as PlanId[]).map((id, n) => {
              const p = PLANS[id];
              return (
                <div key={id} className={`plan-card glass shine rise${id === "pro" ? " hot" : ""}`} style={d(n * 0.06)}>
                  {id === "pro" && <span className="badge">★</span>}
                  <h3>{p.name}</h3>
                  <p className="hint">{t.blurb[id]}</p>
                  <div className="price">{p.priceInr ? `₹${p.priceInr.toLocaleString("en-IN")}` : t.free}{p.priceInr ? <small>{t.perMonth}</small> : null}</div>
                  <ul>
                    <li>{t.mins(p.minutes.toLocaleString("en-IN"), id === "free")}</li>
                    {t.perks.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                  <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`} className={`btn small${id === "pro" ? "" : " ghost"}`}>
                    {id === "free" ? t.start : t.choose(p.name)}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section className="wrap sec faq">
          <h2 className="rise">{t.faqH}</h2>
          <div className="glass faq-list rise">
            {t.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        <section className="wrap">
          <div className="cta-band rise">
            <h2>{t.ctaH}</h2>
            <Link href="/signup" className="btn">{t.start}</Link>
          </div>
        </section>
      </main>

      <footer className="wrap foot">
        <span className="logo"><i />{BRAND.name}</span>
        <span className="muted">© 2026 {BRAND.name} · Powered by <a href="https://thearktech.in" target="_blank" rel="noopener">Arktech</a></span>
      </footer>
    </>
  );
}
