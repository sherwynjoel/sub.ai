"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Effects from "@/components/Effects";
import LegalLinks, { Credit } from "@/components/LegalLinks";
import StickerSlapFooter from "@/components/StickerSlapFooter";
import FruitSticker, { MEDIA } from "@/components/FruitStickerHero";
import HomeUpload from "@/components/HomeUpload";
import StyleShowcase from "@/components/StyleShowcase";
import { BRAND, BUSINESS } from "@/lib/brand";
import { LANGUAGES } from "@/lib/languages";
import { PLANS, type PlanId } from "@/lib/plans";
import { STYLE_CHOICES } from "@/lib/captionStyles";
import LogoName from "@/components/LogoName";

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
  whyH: ["Built for how ", "we really talk", "."],
  why: [
    ["Speaks like you speak", "Tanglish stays Tanglish. Spoken Tamil stays spoken, never turned into textbook Tamil. English sits on the same timing."],
    ["Full quality, every time", "Your video never leaves your device for the export. The finished MP4 keeps the quality you shot in."],
    ["A real timeline", "Drag a caption to fix its timing, split or join lines, find and replace across the video. It saves by itself."],
    ["Fits every frame", "Captions shrink to fit the video in every style, reels or wide. Make one huge and you get a warning, not a surprise."],
  ],
  pluginH: "Work in Premiere Pro or After Effects?",
  pluginP: "Use the panel. Pick a clip and its language, press Generate. Premiere gets a caption track; After Effects gets timed text layers.",
  pluginBtn: "Get the panel",
  stepsH: "From video to subtitles in three steps.",
  steps: [
    ["Drop your video", "Any cut up to 4 GB. Only the sound is sent; the video stays on your device."],
    ["Pick a language and a look", `${LANGUAGES.length} Indian languages with English, and ${STYLE_CHOICES.length} styles to tap through.`],
    ["Fix and download", "Edit any word or timing, then download a styled MP4, SRT, VTT or text."],
  ],
  priceH: "Pay for minutes, not features.",
  priceP: "Monthly, in rupees, through Razorpay with UPI or card. Every plan gets the Premiere panel.",
  free: "Free", perMonth: "/month",
  blurb: { free: PLANS.free.blurb, creator: PLANS.creator.blurb, pro: PLANS.pro.blurb, studio: PLANS.studio.blurb } as Record<PlanId, string>,
  mins: (n: string, once: boolean) => `${n} minutes${once ? ", once" : " a month"}`,
  perks: [`${LANGUAGES.length} Indian languages + English`, "Ready-made caption styles, styled MP4 export", "SRT, VTT and text export", "Premiere & After Effects panel"],
  choose: (name: string) => `Choose ${name}`,
  faqH: "Questions people ask",
  faq: [
    ["Is it really free to try?", "Yes. You get 15 minutes once, with every style. No card. Pay only if you pick a monthly plan."],
    ["Which languages work?", `Tamil, Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi and ${LANGUAGES.length - 7} more Indian languages, each with English on the same timing.`],
    ["Does it get Tanglish?", "Yes. Mixed dialogue stays as spoken: Tamil words in Tamil script, English words in English."],
    ["Is my video safe?", "Only the sound is sent to make the subtitles. The video stays on your device, and the styled MP4 is made there too."],
    ["How long can a video be?", "Files go up to 4 GB. Minutes come out of your plan."],
    ["How do I pay and cancel?", "Monthly in rupees through Razorpay, with UPI or card. Cancel from Billing any time; your minutes stay until the period ends."],
  ],
  ctaH: "Your next video gets subtitles tonight.",
  ctaBtn: "Drop your video",
};

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/**
 * The shapes behind a pricing card, which squish and swap on hover (after 21st.dev's squishy pricing cards,
 * drawn in CSS instead of framer-motion: see .sq-* in app/landing.css). One set per card, 320 × 384.
 */
function SquishyShapes({ kind }: { kind: number }) {
  return (
    <svg className={`sq-bg sq-bg${kind}`} viewBox="0 0 320 384" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {kind === 0 && <>
        <circle className="s1" cx="160.5" cy="114.5" r="101.5" />
        <ellipse className="s2" cx="160.5" cy="265.5" rx="101.5" ry="43.5" />
      </>}
      {kind === 1 && <>
        <rect className="s1" x="14" y="12" width="153" height="153" rx="15" />
        <rect className="s2" x="155" y="219" width="153" height="153" rx="15" />
      </>}
      {kind === 2 && <>
        <path className="s1" d="M148.893 157.531C154.751 151.673 164.249 151.673 170.107 157.531L267.393 254.818C273.251 260.676 273.251 270.173 267.393 276.031L218.75 324.674C186.027 357.397 132.973 357.397 100.25 324.674L51.6068 276.031C45.7489 270.173 45.7489 260.676 51.6068 254.818L148.893 157.531Z" />
        <path className="s2" d="M148.893 99.069C154.751 93.2111 164.249 93.2111 170.107 99.069L267.393 196.356C273.251 202.213 273.251 211.711 267.393 217.569L218.75 266.212C186.027 298.935 132.973 298.935 100.25 266.212L51.6068 217.569C45.7489 211.711 45.7489 202.213 51.6068 196.356L148.893 99.069Z" />
        <path className="s3" d="M148.893 40.6066C154.751 34.7487 164.249 34.7487 170.107 40.6066L267.393 137.893C273.251 143.751 273.251 153.249 267.393 159.106L218.75 207.75C186.027 240.473 132.973 240.473 100.25 207.75L51.6068 159.106C45.7489 153.249 45.7489 143.751 51.6068 137.893L148.893 40.6066Z" />
      </>}
      {kind >= 3 && <>
        <circle className="s1" cx="100" cy="120" r="92" />
        <circle className="s2" cx="236" cy="290" r="62" />
      </>}
    </svg>
  );
}

/** The landing page: English copy with Tamil dialogue samples and a multilingual greeting strip. */
export default function Landing({ popular }: { popular: string[] }) {
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
            <Link href="/" className="logo"><i /><LogoName name={BRAND.name} /></Link>
            <nav aria-label="Main">
              <a href="#upload" className="hide-sm">Try it</a>
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
        {/* Hero: a headline that ends in a hand-written word (click it for another) with fruit stickers to play with. */}
        <FruitSticker
          as="section" headingTag="h1" className="hero-fruit"
          headline="Subtitles that"
          farewells={["speak!", "pop!", "sing!", "hit!"]}
          lines={[`Tamil, Tanglish and ${LANGUAGES.length - 1} more Indian languages,`, "with English on the same timeline."]}
          email="" links={[]} name=""
          stickers={[
            { fruit: "cc", x: 2, y: 66, size: 0.92, rotate: -8 },
            { fruit: "mic", x: 10.5, y: 98, size: 0.72, rotate: 10 },
            { fruit: "clapper", x: 63, y: -28, size: 0.64, rotate: -10, shape: "oval", behind: true },
            { fruit: "bubble", x: 99, y: 84, size: 0.56, rotate: 6, shape: "oval" },
          ]}
          cycle={MEDIA}
          accent="#ff5a3c" ink="var(--ink)" muted="var(--muted)" background="transparent"
          fontSans="var(--font-head)" height="78svh"
        >
          <p className="hello glass" aria-hidden="true">
            <span key={hi} className="hello-word" lang={hello.lang}>{hello.w}</span>
            <span className="hello-lang">{hello.l}</span>
          </p>
          <div className="cta">
            <Link href="/signup" className="btn">{t.cta}</Link>
            <a href="#upload" className="btn ghost">Try it on your video</a>
          </div>
          <p className="note">{t.note}</p>
        </FruitSticker>
        <HomeUpload popular={popular} />

        <section className="wrap hl-langs" aria-label={t.langs}>
          <p className="hl-langs-title">{t.langs}</p>
          <ul className="hl-chips">
            {LANGUAGES.map((l) => <li key={l.code}><b lang={l.code.slice(0, 2)}>{l.native}</b><small>{l.name}</small></li>)}
          </ul>
        </section>

        <section className="wrap sec" id="features">
          <h2 className="rise">{t.whyH[0]}<span className="mark">{t.whyH[1]}</span>{t.whyH[2]}</h2>
          <div className="fx">
            {/* 1: the way people talk, kept: Tamil words in Tamil, English words in English, English under it */}
            <article className="fx-card fx-talk rise">
              <span className="fx-tag">Tanglish · Tamil · English</span>
              <h3>{t.why[0][0]}</h3>
              <p>{t.why[0][1]}</p>
              <div className="fx-chat" aria-hidden="true">
                {[
                  [["Machi,", "en"], ["இந்த", "ta"], ["edit", "en"], ["semma!", "en"], "Dude, this edit is awesome!"],
                  [["மறக்காம", "ta"], ["page-அ", "mix"], ["follow", "en"], ["பண்ணுங்க.", "ta"], "Don't forget to follow the page."],
                  [["Bro,", "en"], ["இது", "ta"], ["next", "en"], ["level!", "en"], "Bro, this is next level!"],
                ].map((line, n) => (
                  <div key={n} className="fx-line" style={d(n * 0.5)}>
                    <b>{(line.slice(0, -1) as [string, string][]).map(([w, k], i) => <span key={i} className={`w-${k}`} lang={k === "ta" ? "ta" : undefined}>{w} </span>)}</b>
                    <small>{line.at(-1) as string}</small>
                  </div>
                ))}
              </div>
              <p className="fx-key" aria-hidden="true"><span className="w-ta">Tamil script</span><span className="w-en">English words</span></p>
            </article>

            {/* 2: quality in = quality out */}
            <article className="fx-card fx-quality glass rise" style={d(0.06)}>
              <h3>{t.why[1][0]}</h3>
              <p>{t.why[1][1]}</p>
              <div className="fx-q" aria-hidden="true">
                <span className="fx-file"><small>Your video</small><b>4K · 60 fps</b></span>
                <span className="fx-arrow">→</span>
                <span className="fx-file out"><small>Your MP4</small><b>4K · 60 fps</b></span>
              </div>
            </article>

            {/* 3: a timeline whose caption gets dragged to the right time */}
            <article className="fx-card fx-time glass rise" style={d(0.12)}>
              <h3>{t.why[2][0]}</h3>
              <p>{t.why[2][1]}</p>
              <div className="fx-tl" aria-hidden="true">
                <span className="fx-wave" />
                <span className="fx-blocks"><i style={{ left: "2%", width: "24%" }} /><i className="drag" style={{ width: "22%" }} /><i style={{ left: "72%", width: "26%" }} /></span>
                <span className="fx-head" />
              </div>
            </article>

            {/* 4: the same caption fitted to a reel and a wide video */}
            <article className="fx-card fx-fit glass rise" style={d(0.18)}>
              <h3>{t.why[3][0]}</h3>
              <p>{t.why[3][1]}</p>
              <div className="fx-frames" aria-hidden="true">
                <span className="fx-frame tall"><b>சத்தியமா, பொய் இல்லை</b></span>
                <span className="fx-frame wide"><b>சத்தியமா, பொய் இல்லை</b></span>
              </div>
            </article>
          </div>
        </section>

        <section className="wrap sec" id="styles">
          <h2 className="rise">{STYLE_CHOICES.length} looks. <span className="mark">One tap.</span></h2>
          <p className="sec-lede rise">These are playing live. Drop your video above to see any of them on your own clip.</p>
          <StyleShowcase popular={popular} />
          <p className="hl-center rise"><a href="#upload" className="btn">Try them on your video</a></p>
        </section>

        <section className="wrap sec" id="how">
          <h2 className="rise">{t.stepsH}</h2>
          <ol className="hl-steps">
            {t.steps.map(([h, p], n) => (
              <li key={n} className="glass rise" style={d(n * 0.08)}>
                <span className="hl-step">{n + 1}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
          <div className="hl-plugin glass rise" id="plugin">
            <div>
              <h3>{t.pluginH}</h3>
              <p>{t.pluginP}</p>
            </div>
            <Link href="/premiere-pro-subtitle-plugin" className="btn ghost">{t.pluginBtn}</Link>
          </div>
        </section>

        <section className="wrap sec" id="pricing">
          <h2 className="rise">{t.priceH}</h2>
          <p className="sec-lede rise">{t.priceP}</p>
          <div className="sq-plans">
            {(Object.keys(PLANS) as PlanId[]).map((id, n) => {
              const p = PLANS[id];
              return (
                // The scroll-in lives on the wrapper so it doesn't override the card's own hover transform.
                <div key={id} className="sq-wrap rise" style={d(n * 0.06)}><div className={`sq-card sq-${id}`}>
                  <div className="sq-body">
                    <span className="sq-label">{p.name}{id === "pro" ? " · popular" : ""}</span>
                    <span className="sq-price">{p.priceInr ? `₹${p.priceInr.toLocaleString("en-IN")}` : t.free}<br />{p.priceInr ? "Month" : "Once"}</span>
                    <p className="sq-mins">{t.mins(p.minutes.toLocaleString("en-IN"), id === "free")}</p>
                    <p className="sq-desc">{t.blurb[id]}</p>
                  </div>
                  <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`} className="sq-cta">{id === "free" ? t.start : t.choose(p.name)}</Link>
                  <SquishyShapes kind={n} />
                </div></div>
              );
            })}
          </div>
          <ul className="sq-perks rise">{t.perks.map((x) => <li key={x}>{x}</li>)}</ul>
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
            <a href="#upload" className="btn">{t.ctaBtn}</a>
          </div>
        </section>
      </main>

      <StickerSlapFooter
        wordmark="vasanamm"
        homeHref="/"
        navLabel="start" navHref="/signup"
        chatHref="" /* no messaging number yet: hides the chat bubble */
        jobsLabel="start here"
        jobs={[
          { title: "start free", href: "/signup" },
          { title: "sign in", href: "/login" },
          { title: "tamil subtitles", href: "/tamil-subtitle-generator" },
          { title: "tanglish captions", href: "/tanglish-captions" },
          { title: "premiere plugin", href: "/premiere-pro-subtitle-plugin" },
        ]}
        officeLabel="made in"
        address={["tamil nadu,", "india"]}
        mapLabel="contact & policies" mapHref="/contact"
        contactLabel="say vanakkam"
        email={BUSINESS.email}
        copiedLabel="copied! talk soon"
        note="We reply within a day: bugs, ideas, Tanglish questions, all welcome."
        socials={[]}
        stickers={[{ kind: "burst", text: "wow" }, { kind: "bubble", text: "vanakkam!" }, "heart", "camera", "smiley", "daisy"]}
        credits={[{ role: "made by", name: "Arktech" }, { role: "stickers", name: "drawn in code, peel freely" }]}
        height="88svh"
        wordmarkMaxHeight="40svh"
        paper="#f3f1f8" panel="#0c0c14" ink="#0c0c14" cream="#f5f2ea" accent="#d4ff3f"
        fontSans="var(--font-sans), system-ui, sans-serif"
        // The policies stay one click away on every page (Razorpay checks for them).
        bottom={<><LegalLinks /><Credit className="" /></>}
      />
    </>
  );
}
