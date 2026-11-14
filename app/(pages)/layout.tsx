import Link from "next/link";
import LegalLinks, { Credit } from "@/components/LegalLinks";
import { BRAND } from "@/lib/brand";
import "./legal.css";
import LogoName from "@/components/LogoName";
import LiquidGlass, { GlassFilter } from "@/components/ui/liquid-glass";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="wrap top">
        <GlassFilter />
        <LiquidGlass className="site-bar">
          <div className="site-head">
            <Link href="/" className="logo"><i /><LogoName name={BRAND.name} /></Link>
            <nav aria-label="Main">
              <Link href="/login">Sign in</Link>
              <Link href="/signup" className="btn small">Get started</Link>
            </nav>
          </div>
        </LiquidGlass>
      </header>
      <main className="wrap legal">{children}</main>
      <footer className="wrap legal-foot">
        <LegalLinks />
        <Credit />
      </footer>
    </>
  );
}
