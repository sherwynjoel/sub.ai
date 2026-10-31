import type { Metadata, Viewport } from "next";
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

const ZOOM_GUARD = `(function(){var d=document,o={passive:false},no=function(e){e.preventDefault()};
["gesturestart","gesturechange","gestureend"].forEach(function(n){d.addEventListener(n,no,o)});
d.addEventListener("touchmove",function(e){if(e.touches.length>1||(e.scale&&e.scale!==1))e.preventDefault()},o);
d.addEventListener("focusout",function(){var v=window.visualViewport,m=d.querySelector('meta[name="viewport"]');if(!m||!v||v.scale<=1.01)return;var c=m.content;m.content=c+",minimum-scale=1";setTimeout(function(){m.content=c},300)});})()`;

/** No zooming the page (the editor is laid out for the screen, and iOS zooms into text fields when they're tapped). */
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${tamil.variable}`} suppressHydrationWarning>
      <head>
        {/* The intro plays once per visit: when this tab's visit already saw it, hide it before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("vs-splash"))document.documentElement.dataset.splash="seen"}catch(e){}` }} />
        {/* iOS ignores user-scalable=no: stop its pinch itself (gesture events in Safari; two-finger moves in in-app
            browsers such as WhatsApp's and Instagram's, which have no gesture events), and if a page did get zoomed (a
            field tapped), snap it back to 100% when the field is left. */}
        <script dangerouslySetInnerHTML={{ __html: ZOOM_GUARD }} />
      </head>
      <body><Splash />{children}<Track /><UpdateBanner /></body>
    </html>
  );
}
