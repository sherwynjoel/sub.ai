import AppHeader from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";
import LegalLinks, { Credit } from "@/components/LegalLinks";
import { BRAND, BUSINESS } from "@/lib/brand";
import InviteReward from "@/components/InviteReward";
import { announcement } from "@/lib/news";
import { unseenInviteMinutes } from "@/lib/referral";
import { effectivePlan, longDate, passEnd, passExpired, PLANS, secondsLeft } from "@/lib/plans";
import "./app.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const plan = effectivePlan(u);
  const total = PLANS[plan].minutes * 60;
  const left = secondsLeft(u);
  const [ann, reward] = await Promise.all([announcement(), unseenInviteMinutes(u)]);
  return (
    <>
      {ann && <div className="announce" role="status">{ann.text}{ann.link && <a href={ann.link}>{ann.linkText || "See more"} →</a>}</div>}
      <AppHeader brand={BRAND.name} isAdmin={u.isAdmin} seconds={left} meter={total ? Math.min(1, left / total) * 100 : left > 0 ? 100 : 0} plan={PLANS[plan].name} expires={passEnd(u) ? `${passExpired(u) ? "Pass ended" : "Unused minutes expire"} ${longDate(passEnd(u)!)}` : ""}
        help={`mailto:${BUSINESS.email}?subject=${encodeURIComponent(`${BRAND.name} help (${u.email})`)}`} />
      <main className="wrap app-main">{children}</main>
      {reward.minutes > 0 && <InviteReward minutes={reward.minutes} reasons={reward.reasons} />}
      <footer className="wrap app-foot">
        <span className="muted small">Need help? Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></span>
        <LegalLinks />
        <Credit className="muted small" />
      </footer>
    </>
  );
}
