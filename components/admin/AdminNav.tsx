"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/jobs", "Operations"],
  ["/admin/users", "Users"],
  ["/admin/revenue", "Revenue"],
  ["/admin/ai", "AI cost"],
  ["/admin/growth", "Growth"],
  ["/admin/billing", "Subscriptions"],
  ["/admin/traffic", "Traffic"],
  ["/admin/styles", "Styles"],
  ["/admin/server", "Server"],
  ["/admin/log", "Admin log"],
];

export default function AdminNav({ invites = 0 }: { invites?: number }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/admin" ? path === href : path.startsWith(href)) ? "page" : undefined}>
          {label}
          {href === "/admin/growth" && invites > 0 && <span className="nav-badge" title={`${invites} invite${invites === 1 ? "" : "s"} to check`}>{invites}</span>}
        </Link>
      ))}
    </nav>
  );
}
