import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, BUSINESS } from "@/lib/brand";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: `Refund and cancellation policy — ${BRAND.name}` };

export default function Page() {
  return (
    <article>
      <h1>Refund and cancellation policy</h1>
      <p className="updated">Last updated {BUSINESS.updated}</p>

      <h2>Try before you pay</h2>
      <p>
        Every new account gets {PLANS.free.minutes} free minutes, with no card needed, so you can check {BRAND.name} on your own videos
        before you subscribe.
      </p>

      <h2>Cancelling</h2>
      <ul>
        <li>You can cancel your subscription at any time from <strong>Billing</strong> in your account.</li>
        <li>After you cancel, you won&apos;t be charged again. Your plan and its remaining minutes stay available until the end of the month you have paid for.</li>
        <li>Your projects and subtitles are not deleted when you cancel.</li>
      </ul>

      <h2>Refunds</h2>
      <p>Because you can try {BRAND.name} free first, monthly payments are generally not refunded once the month has started. We will refund you in full if:</p>
      <ul>
        <li>you were charged twice for the same month, or charged after you cancelled;</li>
        <li>you ask within 7 days of a payment and have used none of that month&apos;s minutes;</li>
        <li>a fault on our side stopped you from using the service for a large part of the month you paid for.</li>
      </ul>
      <p>
        Subtitling that fails doesn&apos;t use your minutes: they are given back automatically, so you don&apos;t need to ask for a refund for it.
      </p>

      <h2>How to ask</h2>
      <p>
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> from your account&apos;s email address with the payment date and
        what went wrong. We reply within 2 working days.
      </p>
      <p>
        Approved refunds are made to the original payment method through Razorpay within 5–7 working days. Your bank may take a few
        more days to show it.
      </p>

      <h2>Questions</h2>
      <p>See the <Link href="/contact">Contact</Link> page.</p>
    </article>
  );
}
