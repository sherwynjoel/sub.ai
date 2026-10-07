"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/jobs", "Operations"],
  ["/admin/users", "Users"],
  ["/admin/billing", "Subscriptions"],
  ["/admin/connections", "Connections"],
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/admin" ? path === href : path.startsWith(href)) ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
