import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <Link href="/" className="logo"><i />{BRAND.name}</Link>
      {children}
    </div>
  );
}
