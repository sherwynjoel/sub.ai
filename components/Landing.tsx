"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Effects from "@/components/Effects";
import LegalLinks, { Credit } from "@/components/LegalLinks";
import StickerSlapFooter from "@/components/StickerSlapFooter";
import FruitSticker, { MEDIA } from "@/components/FruitStickerHero";
import HomeUpload from "@/components/HomeUpload";
import StyleWall from "@/components/StyleWall";
import { BRAND, BUSINESS } from "@/lib/brand";
import { LANGUAGES } from "@/lib/languages";
import { PLANS, type PlanId } from "@/lib/plans";
import { STYLE_CHOICES } from "@/lib/captionStyles";
import LogoName from "@/components/LogoName";
import LiquidGlass, { GlassFilter } from "@/components/ui/liquid-glass";

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
  cta: "Start free · 15 min", note: "No card. No setup.",
  faq: [
    ["Is it really free to try?", "Yes. You get 15 minutes to use within 30 days, with every style. No card. Pay only if you pick a plan."],
    ["Does it get Tanglish?", "Yes. Mixed dialogue stays as spoken: Tamil words in Tamil script, English words in English, with an English translation under it."],
    ["Which languages work?", `Tamil, Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi and ${LANGUAGES.length - 7} more Indian languages, each with English on the same timing.`],
    ["Does it work on my phone?", "Yes, in the browser on Android and iPhone. Long videos and 4K exports are quicker on a computer."],
    ["Is there a watermark?", "Only on the free trial, as a small “Made with Vasanamm” mark. Paid plans have none, and SRT and VTT files never do."],
    ["Can I upload the subtitles to YouTube?", "Yes. Download the SRT and add it in YouTube Studio, or export the MP4 with the captions burned in."],
    ["Is my video safe?", "Only the sound is sent to make the subtitles. The video stays on your device, and the styled MP4 is made there too."],
    ["How long can a video be?", "Files go up to 4 GB. Minutes come out of your plan."],
    ["Do unused minutes carry over?", "No. Every pass lasts 30 days, and the minutes not used by then expire. A new pass starts with fresh minutes."],
    ["How do I pay and cancel?", "In rupees through Razorpay, with UPI or card. Cancel from Billing any time; your minutes stay until the period ends."],
  ],
};

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/** The landing page: English copy with Tamil dialogue samples and a multilingual greeting strip. */
export default function Landing({ popular }: { popular: string[] }) {
  const [hi, setHi] = useState(0);
  const [invited, setInvited] = useState<number | null>(null); // the friend's extra minutes, from an invite link
  useEffect(() => {
    // From /r/<code>: say so once, and tidy the address.
    const q = new URLSearchParams(location.search).get("invited");
    if (q === null) return;
    setInvited(Math.max(0, Math.min(1000, Math.round(Number(q)) || 0))); // eslint-disable-line react-hooks/set-state-in-effect -- read once from the address after hydration
    history.replaceState(null, "", location.pathname + location.hash);
  }, []);

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
        <GlassFilter />
        <LiquidGlass className="site-bar">
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
        </LiquidGlass>
      </header>

      <main>
        {invited !== null && <p className="wrap hm-invited" role="status">A friend invited you to {BRAND.name}. {invited > 0 ? `Sign up for the free trial plus ${invited} extra minutes.` : "Sign up to start your free trial."}</p>}
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

        {/* The languages, in their own scripts, drifting past in two rows. */}
        <section className="hm-langs" aria-label={`${LANGUAGES.length} Indian languages, each with English`}>
          <p className="wrap hm-kicker">{LANGUAGES.length} Indian languages, each with English on the same timing</p>
          <ul className="sr-only">{LANGUAGES.map((l) => <li key={l.code}>{l.name}</li>)}</ul>
          {[LANGUAGES.slice(0, 11), LANGUAGES.slice(11)].map((row, r) => (
            <div key={r} className={`hm-ticker${r ? " back" : ""}`} aria-hidden="true">
              <ul>{[...row, ...row].map((l, i) => <li key={i}><b lang={l.code.slice(0, 2)}>{l.native}</b><small>{l.name}</small></li>)}</ul>
            </div>
          ))}
        </section>

        {/* The problem every Tamil creator has seen, and the fix. */}
        <section className="wrap hm-sec" id="features">
          <div className="hm-head rise">
            <p className="hm-kicker">Why Vasanamm</p>
            <h2>You said &ldquo;edit&rdquo;.<br />Not &ldquo;<span lang="ta">எடிட்</span>&rdquo;.</h2>
            <p className="hm-lede">Most auto-captions push every word into one script, or turn spoken Tamil into textbook Tamil. Vasanamm writes it the way you said it, and puts the English under it on the same timing.</p>
          </div>
          <div className="hm-vs">
            <figure className="hm-frame bad rise">
              <span className="hm-frame-tag">Usual auto-captions</span>
              <p className="hm-cap" lang="ta"><span className="sq">மச்சி</span>, இந்த <span className="sq">எடிட்</span> <span className="sq">செம்ம</span>!</p>
              <figcaption>English words forced into Tamil letters. No English line.</figcaption>
            </figure>
            <figure className="hm-frame good rise" style={d(0.08)}>
              <span className="hm-frame-tag">Vasanamm</span>
              <p className="hm-cap">Machi, <span lang="ta">இந்த</span> edit semma!<small>Dude, this edit is awesome!</small></p>
              <figcaption>Tamil words in Tamil, English words in English, a translation under it.</figcaption>
            </figure>
          </div>
          <p className="hm-note rise">An example of a common mistake, not a test of any one app.</p>
          <dl className="hm-facts">
            {[
              ["Tanglish stays Tanglish", "Mixed sentences are written as spoken, word by word."],
              ["Spoken stays spoken", "“வருவ” stays “வருவ”. It isn't turned into “வருவாய்”."],
              ["English under every line", "Your viewers outside Tamil Nadu can follow too, on the same timing."],
            ].map(([k, v], i) => <div key={k} className="rise" style={d(i * 0.06)}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </section>

        {/* Who it's for, in the jobs they actually do. */}
        <section className="wrap hm-sec" id="who">
          <div className="hm-head rise">
            <p className="hm-kicker">Who uses it</p>
            <h2>Made for people who post every week.</h2>
          </div>
          <ul className="hm-who">
            {[
              ["Reels & Shorts creators", "Captions that pop in the style you post with. One tap to export 1080p for Reels, Shorts and TikTok.", "MP4 · 9:16"],
              ["YouTubers", "Long videos in Tamil or any of 22 languages, with English for viewers abroad. Export in 4K, or upload the SRT to YouTube.", "4K MP4 · SRT"],
              ["Video editors & agencies", "Subtitle client work without leaving Premiere Pro or After Effects. Studio gives you 4,000 minutes a month.", "Premiere · After Effects"],
              ["Teachers, podcasts & brands", "Classes, interviews and ads that people can follow with the sound off.", "SRT · VTT · Text"],
            ].map(([who, what, out], i) => (
              <li key={who} className="rise" style={d(i * 0.05)}>
                <h3>{who}</h3>
                <p>{what}</p>
                <span className="hm-out">{out}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The styles, live: pick one by name, watch it play. */}
        <section className="hm-dark" id="styles">
          <div className="wrap hm-sec">
            <div className="hm-head rise">
              <p className="hm-kicker">Premium caption styles</p>
              <h2>{STYLE_CHOICES.length} styles, every one included.</h2>
              <p className="hm-lede">Pick a look for the whole video, then change its colours, font and size, or make a single word stand out. What you see here is what goes into your MP4.</p>
            </div>
            <StyleWall popular={popular} />
            <p className="hm-row-cta"><a href="#upload" className="btn lime">Try them on your video</a></p>
          </div>
        </section>

        {/* The editor itself: real screenshots, with what each part does. */}
        <section className="wrap hm-sec" id="editor">
          <div className="hm-head rise">
            <p className="hm-kicker">The editor</p>
            <h2>If you&apos;ve used CapCut,<br />you already know it.</h2>
            <p className="hm-lede">Fix a word, move a line, change a style. Every change shows on the video at once and saves by itself.</p>
          </div>
          <div className="hm-shots">
            {/* A MacBook (drawn in CSS) with the editor open in a browser window. */}
            <figure className="mac rise">
              <div className="mac-lid">
                <span className="mac-cam" aria-hidden="true" />
                <div className="mac-screen">
                  <div className="mac-menu" aria-hidden="true">
                    <b>Safari</b><span>File</span><span>Edit</span><span>View</span><span>History</span><span>Window</span>
                    <em>Mon 9 Nov&nbsp;&nbsp;9:41 PM</em>
                  </div>
                  <div className="mac-win">
                    <div className="mac-bar" aria-hidden="true">
                      <span className="mac-lights"><i /><i /><i /></span>
                      <span className="mac-url"><svg viewBox="0 0 10 12"><path d="M2 5V3.5a3 3 0 0 1 6 0V5h.5A1.5 1.5 0 0 1 10 6.5v4A1.5 1.5 0 0 1 8.5 12h-7A1.5 1.5 0 0 1 0 10.5v-4A1.5 1.5 0 0 1 1.5 5H2Zm1.2 0h3.6V3.5a1.8 1.8 0 0 0-3.6 0V5Z" /></svg>vasanamm.com</span>
                    </div>
                    <div className="mac-page">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/home/editor.webp" width={2000} height={1250} loading="lazy" alt="The Vasanamm editor on a computer: the captions in Tamil and English on the left, the video in the middle, caption styles on the right." />
                      {[["21%", "33%"], ["37.5%", "32%"], ["71.6%", "34.4%"], ["30.2%", "91%"]].map(([x, y], i) => <span key={i} className="hm-pin" style={{ left: x, top: y }} aria-hidden="true">{i + 1}</span>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mac-base" aria-hidden="true" />
            </figure>
            {/* An iPhone (drawn in CSS) with the phone editor. */}
            <figure className="iph rise" style={d(0.1)}>
              <div className="iph-body">
                <i className="iph-btn mute" /><i className="iph-btn vol1" /><i className="iph-btn vol2" /><i className="iph-btn power" />
                <div className="iph-screen">
                  <div className="iph-status" aria-hidden="true">
                    <b>9:41</b>
                    <span className="iph-island" />
                    <span className="iph-icons">
                      <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                      <svg viewBox="0 0 16 12"><path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.3-1.4A10.3 10.3 0 0 0 8 .4C5.2.4 2.6 1.5.7 3.4L2 4.8a8.4 8.4 0 0 1 6-2.4Zm0 3.8c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4.2c-1.8 0-3.5.7-4.7 1.9l1.3 1.4C5.5 6.7 6.7 6.2 8 6.2Zm0 3.7c-.6 0-1.1.2-1.5.6L8 12l1.5-1.5c-.4-.4-.9-.6-1.5-.6Z" /></svg>
                      <span className="iph-batt"><i /></span>
                    </span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home/phone.webp" width={780} height={1526} loading="lazy" alt="The same editor on a phone, with buttons to edit text, highlight a word and change timing." />
                  <span className="iph-home" aria-hidden="true" />
                </div>
              </div>
              <figcaption>The same editor on your phone</figcaption>
            </figure>
          </div>
          <ol className="hm-legend">
            {[
              ["Every line, in both languages", "Type straight into the Tamil or English to fix it."],
              ["A live preview", "Your style plays on your own video while you edit."],
              ["Styles for the whole video", "Or give one caption its own look."],
              ["Word by word", "Tap a word to highlight it, change its timing or split the line there."],
            ].map(([k, v], i) => <li key={k} className="rise" style={d(i * 0.05)}><b>{k}</b> {v}</li>)}
          </ol>
          <p className="hm-extras rise">Also: find and replace · undo and redo · translate into any of {LANGUAGES.length} languages · titles and your logo · a timeline to drag captions · keyboard shortcuts</p>
        </section>

        {/* How it works, written as the subtitle file it makes. */}
        <section className="wrap hm-sec hm-how" id="how">
          <div className="hm-head rise">
            <p className="hm-kicker">How it works</p>
            <h2>Three steps, written as a subtitle file.</h2>
            <p className="hm-lede">SRT is the subtitle file YouTube, Premiere and every video app reads. Vasanamm gives you one with every video, along with the styled MP4.</p>
          </div>
          <div className="hm-srt rise" role="list">
            <span className="hm-srt-name" aria-hidden="true">how-it-works.srt</span>
            {[
              ["00:00:00,000 --> 00:00:05,000", "Drop your video. Only the sound is sent;", "the video stays on your device."],
              ["00:00:05,000 --> 00:00:10,000", "Pick the language and a style.", "Subtitles come back timed to every word."],
              ["00:00:10,000 --> 00:00:15,000", "Fix anything, then export an MP4 up to 4K,", "or SRT, VTT and text."],
            ].map(([time, a, b], i) => (
              <div key={i} className="hm-cue" role="listitem">
                <span className="n">{i + 1}</span>
                <span className="tc">{time}</span>
                <span className="tx">{a}<br />{b}</span>
              </div>
            ))}
          </div>
          <div className="hm-export rise">
            <h3>Export for wherever it&apos;s going</h3>
            <table>
              <thead><tr><th>Preset</th><th>Size</th><th>Frame rate</th></tr></thead>
              <tbody>
                {[["Best quality", "Same as your video", "Same as your video"], ["YouTube 4K", "4K UHD", "Same as your video"], ["YouTube / Facebook", "1080p Full HD", "Same as your video"], ["Reels / Shorts / TikTok", "1080p", "30 fps"], ["WhatsApp", "720p, small file", "30 fps"]].map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}
              </tbody>
            </table>
            <p>The MP4 is made on your own phone or computer, so it never waits in a queue.</p>
          </div>
        </section>

        {/* For editors: the panel. */}
        <section className="wrap hm-sec" id="plugin">
          <div className="hm-panel rise">
            <div>
              <p className="hm-kicker">For video editors</p>
              <h2>Stay in Premiere Pro.</h2>
              <p>Pick a clip and its language, press Generate. Premiere gets a caption track you can style and export with the cut. After Effects gets timed text layers.</p>
              <Link href="/premiere-pro-subtitle-plugin" className="btn lime">Get the panel</Link>
            </div>
            {/* The real panel (its own HTML and CSS), as it sits docked in Premiere's dark window. */}
            <figure className="hm-ui">
              <div className="hm-ui-bar" aria-hidden="true"><span className="on">Vasanamm</span><span>Effects</span><span>Lumetri Color</span><b>≡</b></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/home/panel.webp" width={800} height={1588} loading="lazy" alt="The Vasanamm panel in Premiere Pro: pick a clip, the spoken language and a style, then Generate subtitles. It reports a caption track added with 214 lines." />
            </figure>
          </div>
        </section>

        {/* Prices as the 30-day passes they are. */}
        <section className="wrap hm-sec" id="pricing">
          <div className="hm-head rise">
            <p className="hm-kicker">Pricing</p>
            <h2>Pay for minutes.<br />Every style is in every plan.</h2>
            <p className="hm-lede">A minute is one minute of your video. A 1-minute reel uses one minute, however many times you change the words or the style.</p>
          </div>
          <div className="hm-passes">
            {(Object.keys(PLANS) as PlanId[]).map((id, n) => {
              const p = PLANS[id];
              return (
                <article key={id} className={`hm-pass${id === "pro" ? " hot" : ""} rise`} style={d(n * 0.06)}>
                  <header><span>{p.name}</span>{id === "pro" && <em>Popular</em>}</header>
                  <p className="hm-price">{p.priceInr ? <>₹{p.priceInr.toLocaleString("en-IN")}<small> / 30 days</small></> : <>Free<small> once</small></>}</p>
                  <p className="hm-mins"><b>{p.minutes.toLocaleString("en-IN")}</b> minutes</p>
                  <ul>
                    <li>{p.priceInr ? `₹${(p.priceInr / p.minutes).toFixed(2).replace(/\.00$/, "")} a minute` : "No card needed"}</li>
                    <li>{p.priceInr ? `About ${p.minutes.toLocaleString("en-IN")} one-minute reels` : "Every style, with a small Vasanamm mark"}</li>
                    <li>{p.blurb}</li>
                  </ul>
                  <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`} className={`btn${id === "pro" ? " lime" : id === "free" ? "" : " ghost"}`}>{id === "free" ? "Start free" : `Choose ${p.name}`}</Link>
                </article>
              );
            })}
          </div>
          <ul className="hm-fine rise">
            <li>Pay in rupees with UPI or card, through Razorpay</li>
            <li>If a video fails, its minutes are given back</li>
            <li>Paid plans have no watermark</li>
            <li>Minutes not used in 30 days expire</li>
            <li>The Premiere Pro panel is in every plan</li>
          </ul>
        </section>

        <section className="wrap hm-sec hm-faq" id="faq">
          <div className="hm-head rise">
            <p className="hm-kicker">Questions</p>
            <h2>Asked before signing up.</h2>
            <p className="hm-lede">Anything else? Write to <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. A person replies within a day.</p>
          </div>
          <div className="hm-qa rise">
            {t.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        {/* The last word, as a subtitle on a frame. */}
        <section className="wrap hm-sec">
          <div className="hm-end rise">
            <span className="hm-end-tc" aria-hidden="true">REC ● 00:00:59:24</span>
            <h2>Your next video gets subtitles tonight.</h2>
            <p lang="ta">உங்கள் அடுத்த வீடியோவுக்கு இன்றிரவே subtitles.</p>
            <a href="#upload" className="btn lime">Drop your video</a>
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
