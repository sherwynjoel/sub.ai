import Landing from "@/components/Landing";
import { BRAND } from "@/lib/brand";
import { PLANS } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";
import "./landing.css";

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

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Landing />
    </>
  );
}
