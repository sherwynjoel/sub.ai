import type { Metadata } from "next";
import { BRAND, BUSINESS } from "@/lib/brand";

export const metadata: Metadata = { title: "Contact" };

export default function Page() {
  return (
    <article>
      <h1>Contact us</h1>
      <p className="updated">Help with {BRAND.name}, billing, refunds or your data</p>

      <div className="card">
        <dl>
          <dt>Business</dt><dd>{BUSINESS.name}</dd>
          <dt>Email</dt><dd><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></dd>
          {BUSINESS.phone && <><dt>Phone</dt><dd><a href={`tel:${BUSINESS.phone.replace(/\s+/g, "")}`}>{BUSINESS.phone}</a></dd></>}
          {BUSINESS.address && <><dt>Address</dt><dd>{BUSINESS.address}</dd></>}
          {BUSINESS.grievanceOfficer && <><dt>Grievance Officer</dt><dd>{BUSINESS.grievanceOfficer}, at the email above</dd></>}
        </dl>
      </div>

      <p>We answer emails within 2 working days (Monday to Saturday). Please write from your account&apos;s email address so we can find your account.</p>
    </article>
  );
}
