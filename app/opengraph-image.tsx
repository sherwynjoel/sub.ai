import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

// The picture shown when a link to the site is shared (WhatsApp, Instagram, X, LinkedIn). Latin text only: the image
// renderer can't join Tamil letters correctly.
export const alt = `${BRAND.name}: subtitles for Tamil and 21 more Indian languages, plus English`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const bold = await readFile(join(process.cwd(), "public/caption-fonts/Poppins-ExtraBold.ttf"));

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #efe9ff 0%, #f6f5fb 45%, #e3f9ef 100%)", color: "#0c0c14", fontFamily: "Poppins" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#0c0c14", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 16 }}>
            <div style={{ width: 36, height: 7, borderRadius: 4, background: "#d4ff3f" }} />
          </div>
          {BRAND.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>Subtitles that speak Tamil, Tanglish and English</div>
          <div style={{ fontSize: 28, color: "#3d3d4d" }}>22 Indian languages · Premiere Pro & After Effects panel · SRT, VTT, MP4</div>
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ background: "#d4ff3f", borderRadius: 999, padding: "14px 30px", fontSize: 30 }}>15 minutes free</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Poppins", data: bold, style: "normal", weight: 800 }] },
  );
}
