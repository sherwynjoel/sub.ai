"use client";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { DarwazaPreloaderProps } from "@/components/ui/darwaza-preloader";

const DOOR_SCROLL = 1.6; // screens of scrolling; .door-wait in landing.css matches

/**
 * The doorway in front of the styles section: it opens as the visitor scrolls. Fetched and started only as they come
 * near, so the art costs the rest of the page nothing; until then the section is plain content with the door's scroll
 * length kept free (.door-wait), so the links further down the page land in the right place. It doesn't hold the
 * page's scroll (that's for a gate at the very top of a page).
 */
export default function StylesGate({ children }: { children: ReactNode }) {
  const spot = useRef<HTMLDivElement>(null);
  const [Gate, setGate] = useState<ComponentType<DarwazaPreloaderProps> | null>(null);
  useEffect(() => {
    const el = spot.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      import("@/components/ui/darwaza-preloader").then((m) => setGate(() => m.default));
    }, { rootMargin: "150% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!Gate) return <div ref={spot} className="door-wait">{children}</div>;
  return (
    <Gate lockScroll={false} scrollDistance={DOOR_SCROLL} durationMs={2600} title="Our Styles" meta="" cue="Scroll to open" label="Opening"
      logo={<></>}>
      {children}
    </Gate>
  );
}
