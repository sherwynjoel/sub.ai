import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Footer links to the policy pages (every public page shows them; Razorpay checks for them). */
export const LEGAL = [
  ["/contact", "Contact"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/refunds", "Refunds & cancellation"],
  ["/shipping", "Delivery"],
] as const;

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`legal-links ${className}`} aria-label="Policies">
      {LEGAL.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
    </nav>
  );
}

/** The line under the links in every footer. */
export function Credit({ className = "muted" }: { className?: string }) {
  return <span className={className}>© 2026 {BRAND.name} · Powered by <a href="https://thearktech.in" target="_blank" rel="noopener">Arktech</a></span>;
}
