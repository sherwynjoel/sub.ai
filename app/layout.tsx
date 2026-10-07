import type { Metadata } from "next";
import { Anek_Tamil, Unbounded } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const sans = Anek_Tamil({ subsets: ["latin", "tamil"], variable: "--font-sans", display: "swap" });
const display = Unbounded({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: "Upload a video and get timed Tamil and English subtitles you can edit, download as SRT/VTT, or drop straight into Premiere Pro and After Effects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
