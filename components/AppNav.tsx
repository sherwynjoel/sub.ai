"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const links = [
    ["/app", "Projects"],
    ["/app/plugin", "Plugin"],
    ["/app/billing", "Billing"],
    ...(isAdmin ? [["/admin", "Admin"]] : []),
  ];
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }
  return (
    <nav aria-label="App">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/app" ? path === href || path.startsWith("/app/jobs") : path.startsWith(href)) ? "page" : undefined}>
          {label}
        </Link>
      ))}
      <button className="btn ghost small" onClick={signOut}>Sign out</button>
    </nav>
  );
}
