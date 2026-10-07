import Link from "next/link";
import { BRAND } from "@/lib/brand";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <Link href="/" className="logo"><i />{BRAND.name}</Link>
      <div className="auth-rig">
        <span className="auth-lamp" aria-hidden="true" />
        {children}
        <span className="auth-legs" aria-hidden="true" />
      </div>
    </div>
  );
}
