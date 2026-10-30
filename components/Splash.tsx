"use client"
import { useEffect, useState } from "react"
import { VasanamReveal } from "@/components/ui/liquid-glass-logo-reveal"

/** At least this long, so the glass gets to bend the mark before it lifts; at most this long, whatever loads. */
const MIN_MS = 1900, MAX_MS = 4500
const SEEN = "vs-splash"

/**
 * The first screen of a visit: Vasanam's mark in glass while the page loads, then it fades away. Once per visit
 * (a tab's session): a script in <head> hides it before anything is drawn when the visit already saw it. The
 * server sends it with the page, so it covers the page from the first paint; CSS lifts it after 7 s if scripts
 * never run.
 */
export default function Splash() {
  const [state, setState] = useState<"on" | "leaving" | "gone">("on")

  useEffect(() => {
    if (document.documentElement.dataset.splash === "seen") { requestAnimationFrame(() => setState("gone")); return }
    try { sessionStorage.setItem(SEEN, "1") } catch { /* private mode: it shows again next time */ }
    const t0 = performance.now()
    let done = false
    const leave = () => {
      if (done) return
      done = true
      setState("leaving")
      setTimeout(() => setState("gone"), 450)
    }
    const whenLoaded = () => setTimeout(leave, Math.max(0, MIN_MS - (performance.now() - t0)))
    if (document.readyState === "complete") whenLoaded()
    else addEventListener("load", whenLoaded, { once: true })
    const cap = setTimeout(leave, MAX_MS)
    return () => { removeEventListener("load", whenLoaded); clearTimeout(cap) }
  }, [])

  if (state === "gone") return null
  return (
    <div className={`splash${state === "leaving" ? " leaving" : ""}`} aria-hidden={state === "leaving"} role="status" aria-label="Loading Vasanam">
      <VasanamReveal className="splash-glass" loop={false} speed={1.25} />
      <i className="splash-mark" aria-hidden="true" />
    </div>
  )
}
