"use client";
import { useEffect, useState } from "react";

/**
 * A tab keeps running the version it loaded, even across pages, so after an update it can show old behaviour.
 * When the tab comes back into view (and every 10 minutes) it asks the server which build is live and, if it's
 * newer, offers a refresh.
 */
export default function UpdateBanner() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const mine = process.env.APP_BUILD;
    if (!mine) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/version", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.build && d.build !== mine) setStale(true); }).catch(() => {});
    };
    const t = setInterval(check, 10 * 60e3);
    document.addEventListener("visibilitychange", check);
    addEventListener("focus", check);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", check); removeEventListener("focus", check); };
  }, []);
  if (!stale) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version of Vasanam is ready.</span>
      <button onClick={() => location.reload()}>Refresh</button>
      <button className="update-x" onClick={() => setStale(false)} aria-label="Later">×</button>
    </div>
  );
}
