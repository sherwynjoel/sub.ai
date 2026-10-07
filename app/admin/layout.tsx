import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";
import { BRAND } from "@/lib/brand";
import "../app/app.css";
import "./admin.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <>
      <header className="app-head">
        <div className="wrap site-head">
          <Link href="/admin" className="logo"><i />{BRAND.name} admin</Link>
          <span className="muted small">{me.email}</span>
          <Link href="/app" className="btn ghost small">Back to app</Link>
        </div>
      </header>
      <div className="wrap admin-shell">
        <AdminNav />
        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
