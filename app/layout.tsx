import type { Metadata } from "next";
import { Anek_Tamil } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// One family for both scripts; its width axis gives the condensed sign-writer lettering.
const anek = Anek_Tamil({ subsets: ["latin", "tamil"], axes: ["wdth"], variable: "--font-anek", display: "swap" });

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: "Upload a video and get timed Tamil and English subtitles you can edit, download as SRT/VTT, or drop straight into Premiere Pro and After Effects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={anek.variable}>
      <body>{children}</body>
    </html>
  );
}
