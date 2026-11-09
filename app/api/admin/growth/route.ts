import { eq } from "drizzle-orm";
import { after } from "next/server";
import { coupons, db } from "@/db";
import { json } from "@/lib/auth";
import { adminOrNull, logAdmin } from "@/lib/admin";
import { normCode } from "@/lib/coupons";
import { decideInvite, INVITE_MAX } from "@/lib/referral";
import { GROUPS, groupMembers, MAX_PER_SEND, sendNews, setAnnouncement, type Group } from "@/lib/news";

/** Announcement bar, discount codes and emails to groups. */
export async function POST(req: Request) {
  const me = await adminOrNull();
  if (!me) return json({ error: "Admins only." }, 403);
  const b = await req.json().catch(() => ({}));

  switch (b.action) {
    case "announce": {
      const text = String(b.text ?? "").trim().slice(0, 200);
      if (!text) return json({ error: "Write the message." }, 400);
      const link = String(b.link ?? "").trim();
      if (link && !/^(https:\/\/|\/)/.test(link)) return json({ error: "The link must start with https:// or /." }, 400);
      const until = b.until ? new Date(`${b.until}T23:59:59+05:30`) : null;
      await setAnnouncement({ text, link: link || undefined, linkText: String(b.linkText ?? "").trim().slice(0, 40) || undefined, until: until && !isNaN(+until) ? until.toISOString() : undefined });
      await logAdmin(me, "Set the announcement", text);
      return json({ ok: true });
    }
    case "clear_announce":
      await setAnnouncement(null);
      await logAdmin(me, "Removed the announcement");
      return json({ ok: true });

    case "coupon_create": {
      const code = normCode(b.code), percent = Math.round(Number(b.percent)), maxUses = b.maxUses ? Math.round(Number(b.maxUses)) : null;
      if (code.length < 3) return json({ error: "The code needs at least 3 letters or numbers." }, 400);
      if (!(percent >= 1 && percent <= 90)) return json({ error: "Discount must be 1 to 90%." }, 400);
      if (maxUses !== null && !(maxUses >= 1)) return json({ error: "Uses must be 1 or more (or empty for no limit)." }, 400);
      const expiresAt = b.until ? new Date(`${b.until}T23:59:59+05:30`) : null;
      const made = await db.insert(coupons).values({ code, percent, maxUses, expiresAt: expiresAt && !isNaN(+expiresAt) ? expiresAt : null }).onConflictDoNothing().returning();
      if (!made.length) return json({ error: "That code already exists." }, 409);
      await logAdmin(me, `Made code ${code}`, `${percent}% off${maxUses ? `, ${maxUses} uses` : ""}`);
      return json({ ok: true });
    }
    case "coupon_toggle": {
      const code = normCode(b.code);
      await db.update(coupons).set({ active: !!b.active }).where(eq(coupons.code, code));
      await logAdmin(me, `${b.active ? "Turned on" : "Turned off"} code ${code}`);
      return json({ ok: true });
    }

    case "invite_review": {
      const ok = (n: number) => Number.isInteger(n) && n >= 0 && n <= INVITE_MAX;
      const a = Number(b.inviterMinutes ?? 0), f = Number(b.friendMinutes ?? 0), approve = !!b.approve;
      if (approve && !(ok(a) && ok(f))) return json({ error: `Enter whole minutes from 0 to ${INVITE_MAX}.` }, 400);
      if (!/^[0-9a-f-]{36}$/.test(String(b.friendId))) return json({ error: "Invite not found." }, 404);
      const r = await decideInvite(String(b.friendId), approve, a, f);
      if (!r) return json({ error: "Already checked (or not an invite)." }, 409);
      await logAdmin(me, approve ? "Approved an invite" : "Rejected an invite",
        `${r.friend.email} invited by ${r.inviter?.email ?? "?"}${approve ? `: ${a} min to the inviter${f ? `, ${f} to the friend` : ""}` : ""}`);
      return json({ ok: true });
    }

    case "send": {
      const group = b.group as Group, subject = String(b.subject ?? "").trim().slice(0, 150), body = String(b.body ?? "").trim().slice(0, 5000);
      if (!(group in GROUPS)) return json({ error: "Pick who to send to." }, 400);
      if (!subject || !body) return json({ error: "Write a subject and a message." }, 400);
      if (b.test) {
        after(() => sendNews([{ id: me.id, email: me.email, name: me.name }], `[Test] ${subject}`, body));
        return json({ ok: true, sent: 1, to: me.email });
      }
      const people = await groupMembers(group);
      if (!people.length) return json({ error: "Nobody in that group (or they've all unsubscribed)." }, 400);
      after(() => sendNews(people, subject, body)); // carries on after this answer; each email shows in the email log
      await logAdmin(me, `Emailed "${GROUPS[group]}"`, `${Math.min(people.length, MAX_PER_SEND)} people: ${subject}`);
      return json({ ok: true, sent: Math.min(people.length, MAX_PER_SEND), total: people.length });
    }
  }
  return json({ error: "Unknown action." }, 400);
}
