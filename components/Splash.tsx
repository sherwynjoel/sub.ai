"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { VasanamReveal } from "@/components/ui/liquid-glass-logo-reveal"

/** After the reveal has played to the end, the finished logo stays this long before the screen fades. */
const HOLD_MS = 250
/** Only if the reveal never reports its end (a frozen tab, a broken GPU): lift anyway. CSS lifts it at 7 s too. */
const CAP_MS = 1400
const SEEN = "vs-splash"
/** The page shows by this time after the visit started (ms), even if the reveal is still playing or a picture is still loading:
 * on a slow connection the reveal starts late (it needs the page's code), and a visitor shouldn't wait for all of it. */
const BUDGET_MS = 900

/**
 * The first screen of a visit: Vasanamm's mark in glass while the page loads, then it fades away. It always plays
 * the whole reveal when the page is quick, but never stays past BUDGET_MS from the start of the visit once the page
 * is running. Once per visit (a tab's
 * session): a script in <head> hides it before anything is drawn when the visit already saw it. The server sends
 * it with the page, so it covers the page from the first paint.
 */
export default function Splash() {
  const [state, setState] = useState<"on" | "leaving" | "gone">("on")
  const done = useRef({ reveal: false, left: false, late: false })
  const leaveRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (document.documentElement.dataset.splash === "seen") { requestAnimationFrame(() => setState("gone")); return }
    try { sessionStorage.setItem(SEEN, "1") } catch { /* private mode: it shows again next time */ }
    const d = done.current
    const leave = () => {
      if (d.left) return
      d.left = true
      setState("leaving")
      setTimeout(() => setState("gone"), 300)
    }
    // The reveal finished on a loaded page, or the time budget is used up: by then the page is drawn and working (this
    // runs after it has started), and what may still be arriving (below-the-fold pictures, a caption font) fills in.
    // It doesn't wait for the window's load event (every picture and font): the page is drawn and usable well before.
    leaveRef.current = () => { if (d.late || d.reveal) setTimeout(leave, d.reveal ? HOLD_MS : 0) }
    const budget = setTimeout(() => { d.late = true; leaveRef.current() }, Math.max(0, BUDGET_MS - performance.now()))
    const cap = setTimeout(leave, CAP_MS)
    return () => { clearTimeout(cap); clearTimeout(budget) }
  }, [])

  const revealDone = useCallback(() => { done.current.reveal = true; leaveRef.current() }, [])

  if (state === "gone") return null
  return (
    <div className={`splash${state === "leaving" ? " leaving" : ""}`} aria-hidden={state === "leaving"} role="status" aria-label="Loading Vasanamm">
      <VasanamReveal className="splash-glass" loop={false} speed={1.6} onDone={revealDone} />
      <i className="splash-mark" aria-hidden="true" />
    </div>
  )
}
