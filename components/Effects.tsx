"use client";
import { useEffect } from "react";

/**
 * Page motion:
 *  - `.flip` elements flip up into place in 3D when they scroll into view
 *  - `--p` (0→1 over the first screen of scrolling) and `--sy` (px scrolled) drive parallax and tilts
 *  - `--mx` / `--my` (−0.5…0.5) follow the pointer for the floating shapes
 * Content is visible without JS: hidden pre-states only apply once `.js` is on <html>.
 */
export default function Effects() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -12% 0px" },
    );
    document.querySelectorAll(".flip").forEach((el) => io.observe(el));

    let raf = 0;
    const set = (k: string, v: number) => root.style.setProperty(k, v.toFixed(3));
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { set("--p", Math.min(1, scrollY / innerHeight)); set("--sy", scrollY); });
    };
    const onMove = (e: PointerEvent) => { set("--mx", e.clientX / innerWidth - 0.5); set("--my", e.clientY / innerHeight - 0.5); };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    if (matchMedia("(pointer: fine)").matches) addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
