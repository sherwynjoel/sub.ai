import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Noto_Sans_Tamil } from "next/font/google";
import Splash from "@/components/Splash";
import Track from "@/components/Track";
import UpdateBanner from "@/components/UpdateBanner";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", display: "swap" });

const description = "Upload a video and get timed Tamil and English subtitles you can edit, download as SRT/VTT, or drop straight into Premiere Pro and After Effects.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s — ${BRAND.name}` },
  description,
  applicationName: BRAND.name,
  keywords: ["Tamil subtitles", "Tamil subtitle generator", "Tanglish captions", "Premiere Pro subtitles", "Indian language subtitles", "auto captions Tamil", "SRT Tamil"],
  openGraph: { type: "website", siteName: BRAND.name, title: `${BRAND.name} — ${BRAND.tagline}`, description, locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${tamil.variable}`} suppressHydrationWarning>
      <head>
        {/* The intro plays once per visit: when this tab's visit already saw it, hide it before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("vs-splash"))document.documentElement.dataset.splash="seen"}catch(e){}` }} />
      </head>
      <body><Splash />{children}<Track /><UpdateBanner /></body>
    </html>
  );
}
