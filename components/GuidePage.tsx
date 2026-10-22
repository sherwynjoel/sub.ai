import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { PLANS } from "@/lib/plans";
import { PUBLIC_PAGES } from "@/lib/site";

type Props = {
  h1: string;
  lead: string;
  points: [string, string][]; // heading, text
  steps: string[];
  faq: [string, string][];
  path: string;
};

const GUIDES: [string, string][] = [
  ["/tamil-subtitle-generator", "Tamil subtitle generator"],
  ["/tanglish-captions", "Tanglish captions"],
  ["/premiere-pro-subtitle-plugin", "Premiere Pro subtitle plugin"],
];

/** A page written for one search (what people type into Google), with the FAQ marked up for search results. */
export default function GuidePage({ h1, lead, points, steps, faq, path }: Props) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <article className="guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <h1>{h1}</h1>
      <p className="lead">{lead}</p>
      <p className="guide-cta"><Link href="/signup" className="btn">Try it free · {PLANS.free.minutes} minutes</Link> <span className="muted small">No card needed</span></p>

      <div className="guide-points">
        {points.map(([h, t]) => <section key={h} className="card"><h2>{h}</h2><p>{t}</p></section>)}
      </div>

      <h2>How it works</h2>
      <ol className="guide-steps">{steps.map((s) => <li key={s}>{s}</li>)}</ol>

      <h2>Questions</h2>
      <div className="guide-faq">
        {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </div>

      <div className="card guide-end">
        <h2>Subtitle your next video with {BRAND.name}</h2>
        <p>Plans from ₹{PLANS.creator.priceInr} a month after the free minutes. Cancel any time.</p>
        <Link href="/signup" className="btn">Start free</Link>
      </div>

      <nav className="guide-more" aria-label="More guides">
        {GUIDES.filter(([p]) => p !== path && PUBLIC_PAGES.includes(p)).map(([p, l]) => <Link key={p} href={p}>{l}</Link>)}
        <Link href="/">All features</Link>
      </nav>
    </article>
  );
}
