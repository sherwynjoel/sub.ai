"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = [
    ["/app", "Projects"],
    ["/app/plugin", "Plugin"],
    ["/app/billing", "Billing"],
    ...(isAdmin ? [["/admin", "Admin"]] : []),
  ];
  return (
    <nav aria-label="App">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/app" ? path === href || path.startsWith("/app/jobs") : path.startsWith(href)) ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
