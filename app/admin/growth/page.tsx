import Link from "next/link";
import { desc } from "drizzle-orm";
import Action from "@/components/admin/Action";
import AnnounceForm from "@/components/admin/AnnounceForm";
import CouponForm from "@/components/admin/CouponForm";
import InviteReview from "@/components/admin/InviteReview";
import InviteSettingsForm from "@/components/admin/InviteSettingsForm";
import NewsForm from "@/components/admin/NewsForm";
import { coupons, db, users } from "@/db";
import { when } from "@/lib/admin";
import { GROUPS, groupMembers, rawAnnouncement, type Group } from "@/lib/news";
import { INVITE_MESSAGE, inviteSettings, pendingInvites } from "@/lib/referral";
import { count, eq } from "drizzle-orm";
import { effectivePlan, longDate, minSec, PLANS, secondsLeft } from "@/lib/plans";

/** Bringing people back and getting them to pay: who to contact, the announcement bar, codes and group emails. */
export default async function Growth() {
  const groups = Object.keys(GROUPS) as Group[];
  const [inv, [inviters], ann, codes, ending, trial, ...counts] = await Promise.all([
    inviteSettings(),
    db.select({ n: count() }).from(users).where(eq(users.inviteOn, true)),
    rawAnnouncement(),
    db.select().from(coupons).orderBy(desc(coupons.createdAt)),
    groupMembers("ending"),
    groupMembers("trial"),
    ...groups.map((g) => groupMembers(g).then((m) => m.length)),
  ]);
  const toCheck = await pendingInvites();
  const sizes = Object.fromEntries(groups.map((g, i) => [g, counts[i]])) as Record<Group, number>;
  // Trial users who have used most of their free minutes: the likeliest to buy.
  const trialPeople = await db.select().from(users);
  const trialIds = new Set(trial.map((t) => t.id));
  const hot = trialPeople.filter((u) => trialIds.has(u.id) && effectivePlan(u) === "free" && u.secondsUsed >= PLANS.free.minutes * 60 * 0.6)
    .sort((a, b) => b.secondsUsed - a.secondsUsed).slice(0, 30);
  const empty = trialPeople.filter((u) => effectivePlan(u) !== "free" && secondsLeft(u) === 0 && !u.blockedAt).slice(0, 30);

  return (
    <>
      <h1>Growth</h1>
      <div className="two-col">
        <section className="panel">
          <h2>Pass ends in the next 7 days ({ending.length})</h2>
          <p className="muted small">Remind them to renew. Their unused minutes go when the pass ends.</p>
          {ending.length === 0 ? <p className="muted">Nobody.</p> : (
            <ul className="plain-list">{ending.sort((a, b) => +a.periodEnd! - +b.periodEnd!).map((u) => <li key={u.id}><Link href={`/admin/users/${u.id}`}>{u.email}</Link> <span className="muted small">{PLANS[u.plan as keyof typeof PLANS]?.name} · ends {longDate(u.periodEnd!)}</span></li>)}</ul>
          )}
        </section>
        <section className="panel">
          <h2>Trial nearly used up ({hot.length})</h2>
          <p className="muted small">Used 60% or more of the free minutes: the likeliest to buy. A code can tip them over.</p>
          {hot.length === 0 ? <p className="muted">Nobody yet.</p> : (
            <ul className="plain-list">{hot.map((u) => <li key={u.id}><Link href={`/admin/users/${u.id}`}>{u.email}</Link> <span className="muted small">{minSec(Math.max(0, u.secondsUsed))} used</span></li>)}</ul>
          )}
          {empty.length > 0 && (<>
            <h2 className="spaced">Paid, but out of minutes ({empty.length})</h2>
            <p className="muted small">Their pass is still running but every minute is used: offer a bigger plan.</p>
            <ul className="plain-list">{empty.map((u) => <li key={u.id}><Link href={`/admin/users/${u.id}`}>{u.email}</Link> <span className="muted small">{PLANS[effectivePlan(u)].name}</span></li>)}</ul>
          </>)}
        </section>
      </div>

      <section className="panel">
        <h2>Announcement bar</h2>
        <p className="muted small">A message along the top of the app for every signed-in user, e.g. “New: Hindi subtitles” or “Diwali offer: 20% off with DIWALI20”.</p>
        {ann && <p className="announce-preview">{ann.text}{ann.link && <> <a href={ann.link}>{ann.linkText || "See more"}</a></>}{ann.until && <span className="muted small"> · until {when(new Date(ann.until))}</span>}</p>}
        <AnnounceForm current={ann} />
      </section>

      <section className="panel" id="invites">
        <h2>Invites to check ({toCheck.length})</h2>
        <p className="muted small">People who signed up with someone&apos;s invite link. Nothing is given until you approve. Check it&apos;s a real person (a confirmed email, real use, ideally a payment, not the same connection as the inviter), then approve with the minutes to give, or reject.</p>
        {toCheck.length === 0 ? <p className="muted">Nothing to check.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Friend</th><th>Invited by</th><th>Checks</th><th>Give minutes</th></tr></thead>
            <tbody>{toCheck.map(({ friend: f, inviter: by, upTo, sameIp }) => (
              <tr key={f.id}>
                <td><Link href={`/admin/users/${f.id}`}>{f.email}</Link><br /><span className="muted small">joined {when(f.createdAt)}</span></td>
                <td>{by ? <Link href={`/admin/users/${by.id}`}>{by.email}</Link> : <span className="muted">deleted</span>}</td>
                <td className="small">
                  <span className={`status ${f.referralPaidAt ? "good" : "neutral"}`}>{f.referralPaidAt ? `Paid ${when(f.referralPaidAt)}` : "Not paid"}</span>{" "}
                  <span className={`status ${f.emailVerifiedAt ? "good" : "neutral"}`}>{f.emailVerifiedAt ? "Email confirmed" : "Email not confirmed"}</span>{" "}
                  <span className="status neutral">{minSec(Math.max(0, f.secondsUsed))} used</span>
                  {sameIp && <> <span className="status bad">Same connection as inviter</span></>}
                  {f.blockedAt && <> <span className="status bad">Blocked</span></>}
                </td>
                <td><InviteReview friendId={f.id} upTo={upTo} inviter={by?.email ?? "the inviter"} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel" id="invite-settings">
        <h2>Invite settings</h2>
        <p className="muted small">Two switches: this one, and one per user. Only users you turn on (Users › open a user › Invites › Turn on; {inviters?.n ?? 0} so far) see an invite link on their Billing page, and only while invites are on here. Turning invites off hides every link; invites already waiting stay in the list above.</p>
        <InviteSettingsForm on={inv.on} upTo={inv.upTo} message={inv.message === INVITE_MESSAGE ? "" : inv.message} fallback={INVITE_MESSAGE} />
      </section>

      <section className="panel">
        <h2>Discount codes</h2>
        <p className="muted small">Users type the code on the Billing page. Works for one-time payments (30 days), not monthly subscriptions.</p>
        <CouponForm />
        {codes.length > 0 && (
          <div className="table-wrap spaced"><table>
            <thead><tr><th>Code</th><th className="num">Off</th><th className="num">Used</th><th>Ends</th><th>Status</th><th /></tr></thead>
            <tbody>{codes.map((c) => {
              const over = (c.expiresAt && c.expiresAt < new Date()) || (c.maxUses != null && c.uses >= c.maxUses);
              return (
                <tr key={c.code}><td><b>{c.code}</b></td><td className="num">{c.percent}%</td><td className="num">{c.uses}{c.maxUses != null ? ` of ${c.maxUses}` : ""}</td><td>{c.expiresAt ? when(c.expiresAt) : "Never"}</td>
                  <td>{!c.active ? <span className="status neutral">Off</span> : over ? <span className="status neutral">Finished</span> : <span className="status good">On</span>}</td>
                  <td className="actions"><Action url="/api/admin/growth" body={{ action: "coupon_toggle", code: c.code, active: !c.active }} label={c.active ? "Turn off" : "Turn on"} /></td></tr>
              );
            })}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <h2>Email a group</h2>
        <p className="muted small">Sent from the site&apos;s Gmail, one by one (about 1 a second, at most 400 at a time: Gmail allows ~500 a day). Every email has an unsubscribe link; people who unsubscribed are skipped. Each send shows in the email log on the Overview.</p>
        <NewsForm groups={groups.map((g) => ({ id: g, label: GROUPS[g], n: sizes[g] }))} />
      </section>
    </>
  );
}
