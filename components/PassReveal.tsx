"use client";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import HolographicCard from "@/components/ui/holographic-card";
import { PLANS, type PlanId } from "@/lib/plans";

const REEL_MINUTES = 5, FILM_MINUTES = 150;

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

  const { name, minutes } = PLANS[plan];
  const mins = minutes.toLocaleString("en-IN");
  const valid = until ? new Date(until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const foil = plan === "studio" ? "cosmos" : plan === "pro" ? "gold" : plan === "creator" ? "shards" : "aurora";
  const reels = Math.round(minutes / REEL_MINUTES).toLocaleString("en-IN"), films = Math.round(minutes / FILM_MINUTES);

  const lead = (fresh ? "You have activated a" : "This is your").split(" ");
  const hot = [`${mins}-minute`, "Vasanam", "pass"];
  const rest = ["for", "generating", "subtitles."];
  const word = (w: string, i: number) => <span key={i} className="pass-word" style={{ "--i": i } as CSSProperties}>{w} </span>;

  return (
    <dialog ref={ref} className="pass-reveal" tabIndex={-1} aria-label={`${[...lead, ...hot, ...rest].join(" ")}`} onClose={onClose}>
      <HolographicCard foil={foil} label={`Your ${name} pass: ${mins} minutes${valid ? `, valid until ${valid}` : ""}.`}
        front={
          <span className="pass-side">
            <span className="pass-row">
              <span className="pass-brand"><i />Vasanam</span>
              <span className="pass-tier">{name} pass</span>
            </span>
            <span className="pass-ta" lang="ta" aria-hidden="true">வசனம்</span>
            <span className="pass-mins">{mins}<small>minutes</small></span>
            <span className="pass-row pass-foot">
              <span className="pass-field"><small>Holder</small>{holder}</span>
              {valid ? <span className="pass-field end"><small>Valid until</small>{valid}</span>
                : plan === "free" && <span className="pass-field end"><small>Expires</small>Never</span>}
            </span>
          </span>
        }
        back={
          <span className="pass-side">
            <span className="pass-strip" aria-hidden="true" />
            <span className="pass-opens">
              <small>This pass opens</small>
              <b>{mins} minutes of subtitles</b>
              <b>Tamil, Tanglish and English</b>
              <b>{plan === "free" ? "Every style, with a small Vasanam mark" : "Every caption style"}</b>
            </span>
            <span className="pass-row pass-foot">
              <span className="pass-field"><small>Pass no.</small>VSN-{passNo}</span>
              <span className="pass-field end"><small>Issued by</small>Vasanam</span>
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
