import Link from "next/link";
import LegalLinks from "@/components/LegalLinks";
import { BRAND } from "@/lib/brand";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <Link href="/" className="logo"><i />{BRAND.name}</Link>
      {children}
      <p className="auth-foot muted">Tamil and English subtitles for editors.</p>
      <LegalLinks className="auth-legal" />
    </div>
  );
}
