"use client";
import Link from "next/link";
import qrcode from "qrcode-generator";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import HolographicCard from "@/components/ui/holographic-card";
import { BRAND, BUSINESS } from "@/lib/brand";
import { LANGUAGES } from "@/lib/languages";
import { PLANS, type PlanId } from "@/lib/plans";

const REEL_MINUTES = 5, FILM_MINUTES = 150;

/** The QR code for an address, as one SVG path. */
function qrPath(url: string) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return { n, d };
}

/**
 * What a payment buys, shown like the end of a film: the room goes dark, the pass spins in, and the news arrives as a
 * subtitle, word by word. `fresh`: it has just been bought (otherwise it's being looked at again from Billing).
 */
export default function PassReveal({ plan, holder, passNo, until, fresh, onClose }: {
  plan: PlanId; holder: string; passNo: string; until?: string; fresh: boolean; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d || d.open) return;
    d.showModal();
    d.focus(); // not the card, which would open wearing a focus ring
  }, []);

  const { name, minutes, blurb, priceInr } = PLANS[plan];
  const qr = useMemo(() => qrPath(`${location.origin}/app`), []);
  const mins = minutes.toLocaleString("en-IN");
  const valid = until ? new Date(until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const reels = Math.round(minutes / REEL_MINUTES).toLocaleString("en-IN"), films = Math.round(minutes / FILM_MINUTES);

  const lead = (fresh ? "You have activated a" : "This is your").split(" ");
  const hot = [`${mins}-minute`, "Vasanamm", "pass"];
  const rest = ["for", "generating", "subtitles."];
  const word = (w: string, i: number) => <span key={i} className="pass-word" style={{ "--i": i } as CSSProperties}>{w} </span>;

  return (
    <dialog ref={ref} className="pass-reveal" tabIndex={-1} aria-label={`${[...lead, ...hot, ...rest].join(" ")}`} onClose={onClose}>
      <HolographicCard label={`Your ${name} pass: ${mins} minutes${valid ? `, valid until ${valid}` : ""}.`}
        front={
          <span className="pass-side">
            <span className="pass-sky" data-plan={plan}>
              <span className="pass-row">
                <span className="pass-brand"><i />{BRAND.name}</span>
                <span className="pass-tier">{name} pass</span>
              </span>
              <span className="pass-tag">{BRAND.tagline}</span>
              <span className="pass-ta" lang="ta" aria-hidden="true">வசனம்</span>
              <span className="pass-mins">{mins}<small>minutes</small></span>
              <span className="pass-blurb">{blurb}</span>
              <span className="pass-seal" aria-hidden="true" />
            </span>
            <span className="pass-strip">
              <span className="pass-field grow"><small>Holder</small>{holder}</span>
              <span className="pass-field"><small>Pass no.</small>VSN-{passNo}</span>
              {valid ? <span className="pass-field"><small>Valid until</small>{valid}</span>
                : plan === "free" && <span className="pass-field"><small>Expires</small>Never</span>}
            </span>
          </span>
        }
        back={
          <span className="pass-side pass-rear">
            <span className="pass-film" aria-hidden="true" />
            <span className="pass-info">
              <span className="pass-opens">
                <small>This pass opens</small>
                <b>{mins} minutes of subtitles</b>
                <b>Tamil, Tanglish and English</b>
                <b>{LANGUAGES.length} Indian languages</b>
                <b>{plan === "free" ? "Every style, with a small Vasanamm mark" : "Every caption style"}</b>
                <b>SRT and VTT downloads</b>
                <b>The Premiere Pro panel</b>
              </span>
              <span className="pass-qr">
                <svg viewBox={`-2 -2 ${qr.n + 4} ${qr.n + 4}`} role="img" aria-label={`QR code to ${BRAND.name}`}><path d={qr.d} /></svg>
                <small>Scan to open</small>
              </span>
            </span>
            <span className="pass-small">
              <span>{priceInr ? `₹${priceInr.toLocaleString("en-IN")} for 30 days` : "Free trial"}</span>
              <span>{BUSINESS.email}</span>
            </span>
          </span>
        }
      />
      <p className="pass-caption">
        {lead.map(word)}
        <span className="pass-hot">{hot.map((w, i) => word(w, lead.length + i))}</span>
        {rest.map((w, i) => word(w, lead.length + hot.length + i))}
      </p>
      <p className="pass-note">
        That&apos;s about {reels} five-minute reels{films > 0 && `, or ${films} full-length films`}.
      </p>
      <div className="pass-actions">
        <Link href="/app" className="btn pass-go" onClick={() => ref.current?.close()}>Start subtitling</Link>
        <button className="link" onClick={() => ref.current?.close()}>Close</button>
      </div>
    </dialog>
  );
}
