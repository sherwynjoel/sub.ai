import Landing from "@/components/Landing";
import { db } from "@/db";
import { BRAND } from "@/lib/brand";
import { PLANS } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";
import { styleCounts, topStyles } from "@/lib/styleUsage";
import "./landing.css";
import "./home.css";

// What the product is and costs, in the form search engines read (schema.org SoftwareApplication).
const ld = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: BRAND.name,
  url: SITE_URL,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web, macOS, Windows",
  description: "Timed subtitles for Tamil and 21 more Indian languages plus English, with a web editor and a Premiere Pro / After Effects panel.",
  offers: (["free", "creator", "pro", "studio"] as const).map((p) => ({ "@type": "Offer", name: PLANS[p].name, price: PLANS[p].priceInr, priceCurrency: "INR" })),
};

// The most popular styles, worked out again each hour. Customers only, not the admins' tests.
export const revalidate = 3600;

export default async function Home() {
  const popular = topStyles(await styleCounts(db, { customers: true }).catch(() => []));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Landing popular={popular} />
    </>
  );
}
