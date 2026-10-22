import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, BUSINESS } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <article>
      <h1>Privacy policy</h1>
      <p className="updated">Last updated {BUSINESS.updated}</p>

      <p>
        {BUSINESS.name === BRAND.name ? <>{BRAND.name} (&quot;we&quot;) runs this service.</> : <>{BRAND.name} is run by {BUSINESS.name} (&quot;we&quot;).</>} This policy explains what we collect when you use the {BRAND.name} website,
        the Premiere Pro / After Effects panel and the DaVinci Resolve script, why we collect it, and what you can ask us to do with it.
        We follow India&apos;s Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and password. The password is stored only as a salted scrypt hash; we can&apos;t read it.</li>
        <li><strong>Your videos and audio:</strong> the files you upload, or that the panel uploads from your timeline, to make subtitles.</li>
        <li><strong>Your projects:</strong> the subtitles we make, your edits, caption styles, text layers and any logo you upload.</li>
        <li><strong>Usage:</strong> how many minutes you have used, and when each project was made.</li>
        <li><strong>Plugin keys:</strong> the keys that connect the panel to your account. We keep only a fingerprint of each key, not the key itself.</li>
        <li><strong>Payments:</strong> handled by Razorpay. We receive your plan, subscription status and payment references, never your card, UPI or bank details.</li>
        <li><strong>Technical logs:</strong> our server records IP addresses and requests for security and to fix problems.</li>
        <li><strong>Visit counts:</strong> which pages are visited and which website or link sent the visitor, counted on our own server without cookies. Your IP address is turned into a code that changes every day and is not stored, so we can count visitors but not follow anyone.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To make, show and export your subtitles, and to run the panel and script.</li>
        <li>To keep you signed in, count your minutes and manage your plan.</li>
        <li>To answer you when you contact us, and to tell you about important changes to the service.</li>
        <li>To keep the service secure and to find and fix faults.</li>
      </ul>
      <p>We don&apos;t sell your data, show you ads, or use your videos or subtitles to train AI models.</p>

      <h2>Who processes it for us</h2>
      <p>We share data only with the companies that help us run {BRAND.name}, and only what each one needs:</p>
      <ul>
        <li><strong>Speech recognition and translation:</strong> the audio of your video is sent to our AI provider (currently Sarvam AI, India) to turn speech into text and translate it.</li>
        <li><strong>Hosting:</strong> our servers and database run on Amazon Web Services in Mumbai, India.</li>
        <li><strong>Payments:</strong> Razorpay processes subscriptions and payments.</li>
        <li><strong>Email:</strong> Resend delivers the emails we send you, such as password reset links.</li>
      </ul>
      <p>We may also disclose data when Indian law or a valid order from a court or authority requires it.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li><strong>Uploaded videos and exported MP4s:</strong> deleted automatically 7 days after upload.</li>
        <li><strong>Subtitles and projects:</strong> kept until you delete the project or your account.</li>
        <li><strong>Account details:</strong> kept while your account is open.</li>
        <li><strong>Backups:</strong> nightly backups of the database are kept for up to 8 weeks, then deleted.</li>
        <li><strong>Payment records:</strong> kept as long as tax and accounting law requires.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use one cookie, to keep you signed in (for up to 30 days). We don&apos;t use advertising or tracking cookies. The panel and
        script use your plugin key instead of a cookie.
      </p>

      <h2>Your rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>give you a copy of your personal data, or correct it;</li>
        <li>delete your account and everything in it (you can delete any project yourself in the editor);</li>
        <li>stop using your data for a purpose you agreed to.</li>
      </ul>
      <p>Write to us at the address below. We answer within 30 days.</p>

      <h2>Security</h2>
      <p>
        Connections to {BRAND.name} are encrypted (HTTPS). Passwords and plugin keys are stored only as hashes, and access to the servers
        is limited to the people who run the service. No system is perfectly secure; if a breach affects your data, we will tell you
        and the authorities as the law requires.
      </p>

      <h2>Children</h2>
      <p>{BRAND.name} is for people aged 18 and over. Anyone younger may use it only with a parent or guardian&apos;s consent.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date above and, for important changes, email account holders before they apply.</p>

      <h2>Contact and grievances</h2>
      <p>
        Questions, requests and complaints about your data go to our Grievance Officer{BUSINESS.grievanceOfficer && <>, {BUSINESS.grievanceOfficer}</>},
        at <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. All our contact details are on the <Link href="/contact">Contact</Link> page.
      </p>
    </article>
  );
}
