import AppHeader from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";
import LegalLinks, { Credit } from "@/components/LegalLinks";
import { BRAND, BUSINESS } from "@/lib/brand";
import { effectivePlan, longDate, passEnd, passExpired, PLANS, secondsLeft } from "@/lib/plans";
import "./app.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const plan = effectivePlan(u);
  const total = PLANS[plan].minutes * 60;
  const left = secondsLeft(u);
  return (
    <>
      <AppHeader brand={BRAND.name} isAdmin={u.isAdmin} seconds={left} meter={Math.min(1, left / total) * 100} plan={PLANS[plan].name} expires={passEnd(u) ? `${passExpired(u) ? "Pass ended" : "Unused minutes expire"} ${longDate(passEnd(u)!)}` : ""}
        help={`mailto:${BUSINESS.email}?subject=${encodeURIComponent(`${BRAND.name} help (${u.email})`)}`} />
      <main className="wrap app-main">{children}</main>
      <footer className="wrap app-foot">
        <span className="muted small">Need help? Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></span>
        <LegalLinks />
        <Credit className="muted small" />
      </footer>
    </>
  );
}
