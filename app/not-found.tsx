import Link from "next/link";
import { BRAND } from "@/lib/brand";
import "./(pages)/legal.css";
import LogoName from "@/components/LogoName";
import LiquidGlass, { GlassFilter } from "@/components/ui/liquid-glass";

export const metadata = { title: "Page not found" };

/** Any address that doesn't exist (or a project that was deleted). */
export default function NotFound() {
  return (
    <>
      <header className="wrap top">
        <GlassFilter />
        <LiquidGlass className="site-bar">
          <div className="site-head">
            <Link href="/" className="logo"><i /><LogoName name={BRAND.name} /></Link>
          </div>
        </LiquidGlass>
      </header>
      <main className="wrap legal not-found">
        <h1>This page isn&apos;t here</h1>
        <p className="muted">The link may be old, or the project was deleted.</p>
        <p className="nf-links">
          <Link href="/app" className="btn">Your projects</Link>
          <Link href="/" className="btn ghost">Home</Link>
        </p>
      </main>
    </>
  );
}
