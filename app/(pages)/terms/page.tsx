import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, BUSINESS } from "@/lib/brand";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Terms of service" };

export default function Page() {
  const paid = (["creator", "pro", "studio"] as const).map((p) => PLANS[p]);
  return (
    <article>
      <h1>Terms of service</h1>
      <p className="updated">Last updated {BUSINESS.updated}</p>

      <p>
        These terms are an agreement between you and {BUSINESS.name === BRAND.name ? BRAND.name : `${BUSINESS.name}, which runs ${BRAND.name}`}. By creating an account or using the website,
        the Premiere Pro / After Effects panel or the DaVinci Resolve script, you accept them. If you use {BRAND.name} for a company,
        you accept them for that company.
      </p>

      <h2>The service</h2>
      <p>
        {BRAND.name} makes subtitles from the speech in your videos, in Tamil and other Indian languages and in English, and lets you
        edit, style and export them. Subtitles are made automatically by AI and can contain mistakes: check them before you publish.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older, or have a parent or guardian&apos;s consent.</li>
        <li>Give a real email address and keep your password and plugin keys private. You are responsible for what is done with them.</li>
        <li>One account is for one person or team. Don&apos;t share or resell access.</li>
      </ul>

      <h2>Plans, minutes and payment</h2>
      <ul>
        <li>New accounts get {PLANS.free.minutes} free trial minutes, once.</li>
        <li>
          Paid plans are monthly subscriptions in Indian rupees: {paid.map((p) => `${p.name} ₹${p.priceInr} for ${p.minutes} minutes`).join(", ")}.
          Prices include any applicable taxes unless the checkout says otherwise.
        </li>
        <li>Minutes are counted by the length of each video you subtitle. Unused minutes don&apos;t carry over to the next month.</li>
        <li>If subtitling fails, the minutes for that video are given back automatically.</li>
        <li>Subscriptions renew every month through Razorpay until you cancel. Cancelling and refunds are covered in our <Link href="/refunds">Refund and cancellation policy</Link>.</li>
        <li>We may change prices with at least 30 days&apos; notice by email; the new price applies from your next renewal.</li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>Your videos and subtitles stay yours. You give us permission to store and process them only to provide the service to you.</li>
        <li>You must have the right to upload what you upload. Don&apos;t upload anything illegal, or anything that infringes someone else&apos;s rights.</li>
        <li>Uploaded videos and exported MP4s are deleted after 7 days; download what you need before then. Subtitles stay until you delete them.</li>
      </ul>

      <h2>Fair use</h2>
      <p>
        Don&apos;t try to break, overload, copy or get around the limits of the service, or use it to harm others. We may suspend
        accounts that do, and will tell you why.
      </p>

      <h2>Caption templates and fonts</h2>
      <p>
        The panel includes motion graphics templates and fonts that are licensed to us or free to use. You may use them in your own
        videos made with {BRAND.name}, but not resell or redistribute them separately.
      </p>

      <h2>Availability and liability</h2>
      <p>
        We work to keep {BRAND.name} running and your data safe, but we provide it &quot;as is&quot;, without a guarantee that it will
        always be available or error-free. As far as the law allows, we are not liable for indirect losses (such as lost income or
        missed deadlines), and our total liability to you is limited to what you paid us in the 3 months before the claim.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can stop using {BRAND.name} at any time and ask us to delete your account. We may close accounts that break these terms.
        If we ever shut down the service, we will give at least 30 days&apos; notice so you can download your subtitles.
      </p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms. For important changes we will email you before they apply; using the service afterwards means you accept them.</p>

      <h2>Law and disputes</h2>
      <p>
        These terms are governed by the laws of India. Please contact us first so we can try to sort things out; if we can&apos;t,
        {BUSINESS.city ? `the courts of ${BUSINESS.city} have jurisdiction.` : "the courts of India have jurisdiction."}
      </p>

      <h2>Contact</h2>
      <p>Write to <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>, or see the <Link href="/contact">Contact</Link> page.</p>
    </article>
  );
}
