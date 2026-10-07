"use client";
import { useEffect } from "react";

/**
 * Page-wide motion in one place:
 *  - `.reveal` elements fade/slide in when scrolled into view
 *  - `.tilt` cards lean toward the pointer in 3D and get a spotlight (--mx/--my)
 *  - `[data-step]` sections set data-active on their `[data-steps]` container (sticky story)
 * Does nothing extra when the user prefers reduced motion.
 */
export default function Effects() {
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), reveal.unobserve(e.target))),
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

    const steps = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const box = (e.target as HTMLElement).closest<HTMLElement>("[data-steps]");
        if (box) box.dataset.active = (e.target as HTMLElement).dataset.step;
      }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    document.querySelectorAll("[data-step]").forEach((el) => steps.observe(el));

    let raf = 0;
    const move = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".tilt");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--cx", `${e.clientX}px`);
        document.documentElement.style.setProperty("--cy", `${e.clientY}px`);
        if (!card) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${x * 100}%`);
        card.style.setProperty("--my", `${y * 100}%`);
        if (!still) card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg) translateZ(0)`;
      });
    };
    const leave = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest?.<HTMLElement>(".tilt");
      if (card && !card.contains(e.relatedTarget as Node)) card.style.transform = "";
    };
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", leave);
    return () => {
      reveal.disconnect();
      steps.disconnect();
      removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", leave);
    };
  }, []);
  return null;
}
