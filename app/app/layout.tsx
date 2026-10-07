import Link from "next/link";
import AppNav from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
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
          <Link href="/app/billing" className="minutes" title={`${PLANS[plan].name} plan`}>
            <span>{Math.floor(left / 60)} min left</span>
            <span className="meter" aria-hidden="true"><i style={{ width: `${(left / total) * 100}%` }} /></span>
          </Link>
        </div>
      </header>
      <main className="wrap app-main">{children}</main>
    </>
  );
}
