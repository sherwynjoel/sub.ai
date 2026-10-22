"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Counts a page visit (no cookies; see /api/hit). Project ids are folded so the counts group by page. */
export default function Track() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    const q = new URLSearchParams(location.search);
    const body = JSON.stringify({
      p: path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id"),
      r: document.referrer,
      s: q.get("utm_source") ?? q.get("ref") ?? undefined,
    });
    try {
      if (!navigator.sendBeacon?.("/api/hit", new Blob([body], { type: "application/json" }))) fetch("/api/hit", { method: "POST", body, keepalive: true }).catch(() => {});
    } catch {}
  }, [path]);
  return null;
}
