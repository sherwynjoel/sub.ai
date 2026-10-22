import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, BUSINESS } from "@/lib/brand";

export const metadata: Metadata = { title: `Delivery policy — ${BRAND.name}` };

export default function Page() {
  return (
    <article>
      <h1>Delivery policy</h1>
      <p className="updated">Last updated {BUSINESS.updated}</p>

      <p>{BRAND.name} is an online service. Nothing is shipped, and there is no physical product.</p>

      <h2>When you get access</h2>
      <ul>
        <li><strong>Plans:</strong> your plan and its minutes are active as soon as Razorpay confirms the payment, usually within a minute.</li>
        <li><strong>Subtitles:</strong> made online, usually in under a minute for a short video and a few minutes for a long one.</li>
        <li><strong>Downloads:</strong> subtitle files, MP4 exports, the Premiere Pro / After Effects panel and the DaVinci Resolve script are downloaded from your account.</li>
      </ul>

      <h2>If something hasn&apos;t arrived</h2>
      <p>
        If your plan isn&apos;t active 30 minutes after paying, or a download doesn&apos;t work, write to{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we will sort it out. See also our{" "}
        <Link href="/refunds">Refund and cancellation policy</Link>.
      </p>
    </article>
  );
}
