import type { Metadata } from "next";
import { Bricolage_Grotesque, Noto_Sans_Tamil } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const sans = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", display: "swap" });

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: "Upload a video and get timed Tamil and English subtitles you can edit, download as SRT/VTT, or drop straight into Premiere Pro and After Effects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${tamil.variable}`}>
      <body>{children}</body>
    </html>
  );
}
