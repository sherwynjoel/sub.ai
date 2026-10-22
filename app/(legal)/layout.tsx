import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";
import { BRAND, BUSINESS } from "@/lib/brand";
import "./legal.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="wrap top">
        <div className="site-bar">
          <div className="site-head">
            <Link href="/" className="logo"><i />{BRAND.name}</Link>
            <nav aria-label="Main">
              <Link href="/login">Sign in</Link>
              <Link href="/signup" className="btn small">Start free</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="wrap legal">{children}</main>
      <footer className="wrap legal-foot">
        <LegalLinks />
        <span className="muted">© 2026 {BUSINESS.name}</span>
      </footer>
    </>
  );
}
