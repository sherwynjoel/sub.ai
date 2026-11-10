"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { VasanamReveal } from "@/components/ui/liquid-glass-logo-reveal"

/** After the reveal has played to the end, the finished logo stays this long before the screen fades. */
const HOLD_MS = 250
/** Only if the reveal never reports its end (a frozen tab, a broken GPU): lift anyway. CSS lifts it at 7 s too. */
const CAP_MS = 6500
const SEEN = "vs-splash"
/** The page shows by this time after the visit started (ms) once it has loaded, even if the reveal is still playing:
 * on a slow connection the reveal starts late (it needs the page's code), and a visitor shouldn't wait for all of it. */
const BUDGET_MS = 2600

/**
 * The first screen of a visit: Vasanamm's mark in glass while the page loads, then it fades away. It always plays
 * the whole reveal when the page is quick, waits for the page if that's slower, but never holds a loaded page past
 * BUDGET_MS from the start of the visit. Once per visit (a tab's
 * session): a script in <head> hides it before anything is drawn when the visit already saw it. The server sends
 * it with the page, so it covers the page from the first paint.
 */
export default function Splash() {
  const [state, setState] = useState<"on" | "leaving" | "gone">("on")
  const done = useRef({ reveal: false, page: false, left: false, late: false })
  const leaveRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (document.documentElement.dataset.splash === "seen") { requestAnimationFrame(() => setState("gone")); return }
    try { sessionStorage.setItem(SEEN, "1") } catch { /* private mode: it shows again next time */ }
    const d = done.current
    const leave = () => {
      if (d.left) return
      d.left = true
      setState("leaving")
      setTimeout(() => setState("gone"), 450)
    }
    // The page has to be loaded, and the reveal finished or the time budget used up.
    leaveRef.current = () => { if (d.page && (d.reveal || d.late)) setTimeout(leave, d.reveal ? HOLD_MS : 0) }
    const budget = setTimeout(() => { d.late = true; leaveRef.current() }, Math.max(0, BUDGET_MS - performance.now()))
    const loaded = () => { d.page = true; leaveRef.current() }
    if (document.readyState === "complete") loaded()
    else addEventListener("load", loaded, { once: true })
    const cap = setTimeout(leave, CAP_MS)
    return () => { removeEventListener("load", loaded); clearTimeout(cap); clearTimeout(budget) }
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
