"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import SignOut from "@/components/SignOut";
import LogoName from "@/components/LogoName";

/**
 * The app's header: the logo, the pages, the minutes left, Help and Sign out. On phones one slim row (the logo, the
 * minutes and a menu button), the pages and the rest in the menu.
 */
export default function AppHeader({ brand, isAdmin, minutes, meter, plan, help }: {
  brand: string; isAdmin: boolean; minutes: number; meter: number; plan: string; help: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => { // a page picked from the menu closes it
    const id = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(id);
  }, [path]);
  return (
    <header className="app-head" data-open={open || undefined}>
      <div className="wrap site-head">
        <Link href="/app" className="logo"><i /><LogoName name={brand} /></Link>
        <AppNav isAdmin={isAdmin} />
        <div className="account">
          <Link href="/app/billing" className="minutes" title={`${plan} plan`}>
            <span>{minutes} min left</span>
            <span className="meter" aria-hidden="true"><i style={{ width: `${meter}%` }} /></span>
          </Link>
          <a className="signout" href={help}>Help</a>
          <SignOut />
        </div>
        <button className="menu-btn" aria-label={open ? "Close the menu" : "Open the menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </header>
  );
}
