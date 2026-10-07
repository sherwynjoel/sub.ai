import Link from "next/link";
import { BRAND } from "@/lib/brand";
import "./auth.css";

const FLOATERS = [
  { text: "வணக்கம்", x: "12%", y: "18%", d: "0s" },
  { text: "Action!", x: "78%", y: "14%", d: "1.2s" },
  { text: "00:01:12,400", x: "8%", y: "72%", d: ".6s" },
  { text: "சூப்பர்", x: "82%", y: "70%", d: "1.8s" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-orb" aria-hidden="true" />
      {FLOATERS.map((f) => (
        <span key={f.text} className="floater" aria-hidden="true" style={{ left: f.x, top: f.y, animationDelay: f.d }}>{f.text}</span>
      ))}
      <Link href="/" className="logo"><i />{BRAND.name}</Link>
      {children}
    </div>
  );
}
