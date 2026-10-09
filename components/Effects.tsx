"use client";
import { useEffect } from "react";

/**
 * Page motion, kept to two ideas:
 *  - `--p` (0→1 across the first ~70% of a screen of scrolling) straightens the hero product shot
 *  - `.reveal` sections rise in once when they enter the viewport
 * Content is visible without JS: hidden pre-states only apply once `.js` is on <html>.
 */
export default function Effects() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => root.style.setProperty("--p", Math.min(1, scrollY / (innerHeight * 0.7)).toFixed(3)));
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
