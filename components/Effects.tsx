"use client";
import { useEffect } from "react";

/**
 * Page interactions:
 *  - `.rise` elements rise into place when they scroll into view
 *  - `.tilt` panels lean toward the pointer; `.tilt` and `.shine` glass gets a light spot at the cursor (--x/--y)
 *  - `[data-scroll]` elements get --p (0 to 1) as they travel up the viewport, for scroll-driven 3D
 * Content is visible without JS; reduced motion turns tilt and scroll motion off.
 */
export default function Effects() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll(".rise").forEach((el) => io.observe(el));

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches;
    const move = (e: PointerEvent) => {
      const t = (e.target as Element).closest<HTMLElement>(".tilt, .shine");
      if (!t) return;
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      t.style.setProperty("--x", `${x * 100}%`);
      t.style.setProperty("--y", `${y * 100}%`);
      if (!still && t.matches(".tilt")) t.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg)`;
    };
    const leave = (e: PointerEvent) => {
      const t = (e.target as Element).closest?.<HTMLElement>(".tilt");
      if (t && !t.contains(e.relatedTarget as Node)) t.style.transform = "";
    };
    const scrolled = [...document.querySelectorAll<HTMLElement>("[data-scroll]")];
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => scrolled.forEach((el) => {
        const top = el.getBoundingClientRect().top / innerHeight;
        el.style.setProperty("--p", String(Math.min(1, Math.max(0, (0.62 - top) / 0.5))));
      }));
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) scrolled.forEach((el) => el.style.setProperty("--p", "1"));
    else { onScroll(); addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); }

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", leave);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", leave);
    };
  }, []);
  return null;
}
