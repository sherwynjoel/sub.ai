"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Spider = dynamic(() => import("@/components/ui/silk-spider-cursor"), { ssr: false });

/** What the silk may stick to: the page's headings, cards and buttons. */
const ANCHORS = "main h1, main h2, main .btn, .tile, .examples div, .cta-band";

/**
 * The home page's spider, which walks after the pointer and spins silk between the page's cards. Only where there is
 * a pointer to follow, and fetched a moment after the page has loaded (three.js is a large download).
 */
export default function HomeSpider() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const id = setTimeout(() => setOn(true), 1800);
    return () => clearTimeout(id);
  }, []);
  return on ? <Spider anchorSelector={ANCHORS} size={190} silkColor="#55556e" bounceColor="#f4f3fb" shadowColor="#1a1a2e" zIndex={50} /> : null;
}
