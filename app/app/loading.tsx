import { VasanamReveal } from "@/components/ui/liquid-glass-logo-reveal"

/** While a page is being prepared (opening a project, the dashboard…): the mark in glass, looping. */
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-label="Loading">
      <VasanamReveal className="page-loading-glass" tileSize={180} hold={0.4} />
    </div>
  )
}
