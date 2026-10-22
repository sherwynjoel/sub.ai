import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/PasswordForms";
import { resetUser } from "@/lib/reset";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const u = await resetUser(token);
  if (!u) {
    return (
      <div className="auth">
        <h1>This link doesn&apos;t work any more</h1>
        <p className="muted">Reset links work once, for a limited time.</p>
        <Link href="/forgot" className="btn">Get a new link</Link>
      </div>
    );
  }
  return <ResetForm token={token} email={u.email} />;
}
