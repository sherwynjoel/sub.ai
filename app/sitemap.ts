import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({ url: SITE_URL + (p === "/" ? "" : p), changeFrequency: "monthly", priority: p === "/" ? 1 : p.includes("-") ? 0.8 : 0.4 }));
}
