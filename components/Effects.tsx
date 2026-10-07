"use client";
import { useEffect } from "react";

/**
 * Page motion in one grammar:
 *  - `.hoist` boards swing down into place on their top hinge when scrolled into view
 *  - `--walk` (0→1 over the first screen) lets the street scene dolly past as you scroll
 * Content is visible without JS: the hidden pre-state only applies once `.js` is on <html>.
 */
export default function Effects() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("up"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -12% 0px" },
    );
    document.querySelectorAll(".hoist").forEach((el) => io.observe(el));

    let raf = 0;
    const walk = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => root.style.setProperty("--walk", Math.min(1, scrollY / innerHeight).toFixed(3)));
    };
    walk();
    addEventListener("scroll", walk, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener("scroll", walk);
    };
  }, []);
  return null;
}
