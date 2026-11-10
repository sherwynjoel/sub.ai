"use client";
import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element is within `margin` of the screen (and stays true). The home page's videos wait for it
 * before fetching their poster and video, so they don't slow down the first screen.
 */
export function useNear(ref: RefObject<Element | null>, margin = "600px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; } // eslint-disable-line react-hooks/set-state-in-effect -- old browsers: load at once
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
