import Link from "next/link";
import AppNav from "@/components/AppNav";
import SignOut from "@/components/SignOut";
import { requireUser } from "@/lib/auth";
import LegalLinks, { Credit } from "@/components/LegalLinks";
import { BRAND, BUSINESS } from "@/lib/brand";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";
import "./app.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const plan = effectivePlan(u);
  const total = PLANS[plan].minutes * 60;
  const left = secondsLeft(u);
  return (
    <>
      <header className="app-head">
        <div className="wrap site-head">
          <Link href="/app" className="logo"><i />{BRAND.name}</Link>
          <AppNav isAdmin={u.isAdmin} />
          <div className="account">
            <Link href="/app/billing" className="minutes" title={`${PLANS[plan].name} plan`}>
              <span>{Math.floor(left / 60)} min left</span>
              <span className="meter" aria-hidden="true"><i style={{ width: `${Math.min(1, left / total) * 100}%` }} /></span>
            </Link>
            <a className="signout" href={`mailto:${BUSINESS.email}?subject=${encodeURIComponent(`${BRAND.name} help (${u.email})`)}`}>Help</a>
            <SignOut />
          </div>
        </div>
      </header>
      <main className="wrap app-main">{children}</main>
      <footer className="wrap app-foot">
        <span className="muted small">Need help? Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></span>
        <LegalLinks />
        <Credit className="muted small" />
      </footer>
    </>
  );
}
