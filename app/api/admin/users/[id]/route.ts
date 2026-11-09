import { eq, sql } from "drizzle-orm";
import { db, sessions, users } from "@/db";
import { json } from "@/lib/auth";
import { adminOrNull, logAdmin } from "@/lib/admin";
import { logUse } from "@/lib/credits";
import { minSec, PLANS, type PlanId } from "@/lib/plans";
import { resetLink } from "@/lib/reset";

/** Admin account actions. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminOrNull();
  if (!me) return json({ error: "Admins only." }, 403);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const [u] = /^[0-9a-f-]{36}$/.test(id) ? await db.select().from(users).where(eq(users.id, id)) : [];
  if (!u) return json({ error: "User not found." }, 404);
  const where = eq(users.id, u.id);
  const log = (action: string, detail?: string) => logAdmin(me, action, detail, u);
  const reason = String(b.reason ?? "").trim().slice(0, 200);

  switch (b.action) {
    case "reset_usage":
      await db.update(users).set({ secondsUsed: 0 }).where(where);
      await log("Reset minutes used", `Was ${minSec(Math.max(0, u.secondsUsed))}`);
      break;
    case "add_minutes": {
      const m = Math.round(Number(b.minutes));
      if (!Number.isFinite(m) || m === 0 || Math.abs(m) > 100000) return json({ error: "Enter a number of minutes." }, 400);
      // Bonus minutes = less usage counted (can go negative, which works as credit).
      await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} - ${m * 60}` }).where(where);
      // In the user's own history too, so they see why their minutes went up (or down).
      await logUse(u.id, -m * 60, { kind: "bonus", video: "Your account", detail: reason || undefined });
      await log(m > 0 ? `Added ${m} min` : `Removed ${-m} min`, reason || undefined);
      break;
    }
    case "invite_minutes": {
      const m = b.minutes == null ? null : Number(b.minutes);
      if (m !== null && !(Number.isInteger(m) && m >= 0 && m <= 1000)) return json({ error: "Enter whole minutes from 0 to 1000, or leave it empty." }, 400);
      await db.update(users).set({ inviteMinutes: m }).where(where);
      await log("Set invite minutes", m === null ? "site-wide amount" : `up to ${m} min`);
      break;
    }
    case "note":
      await db.update(users).set({ adminNote: String(b.note ?? "").slice(0, 4000) || null }).where(where);
      await log("Changed the note");
      break;
    case "block":
      if (u.id === me.id) return json({ error: "You can't block yourself." }, 400);
      if (u.isAdmin) return json({ error: "Remove their admin access first." }, 400);
      await db.update(users).set({ blockedAt: new Date(), blockReason: reason || null }).where(where);
      await db.delete(sessions).where(eq(sessions.userId, u.id));
      await log("Blocked", reason);
      break;
    case "unblock":
      await db.update(users).set({ blockedAt: null, blockReason: null }).where(where);
      await log("Unblocked");
      break;
    case "set_plan": {
      const plan = b.plan as PlanId;
      const days = Math.round(Number(b.days));
      if (!(plan in PLANS) || (plan !== "free" && !(days > 0 && days <= 3660))) return json({ error: "Pick a plan and number of days." }, 400);
      // Manual/complimentary plan; a Razorpay subscription will overwrite it on its next charge.
      await db.update(users).set({ plan, periodEnd: plan === "free" ? null : new Date(Date.now() + days * 864e5), secondsUsed: 0 }).where(where);
      await log(`Set plan to ${PLANS[plan].name}`, plan === "free" ? undefined : `${days} days`);
      break;
    }
    case "set_admin":
      if (u.id === me.id) return json({ error: "You can't change your own admin access." }, 400);
      await db.update(users).set({ isAdmin: !!b.value }).where(where);
      await log(b.value ? "Made admin" : "Removed admin");
      break;
    case "reset_link":
      // Valid for a day: it's sent by hand (WhatsApp, email), not straight away.
      await log("Made a password reset link");
      return json({ ok: true, link: await resetLink(u.id, 24) });
    case "sign_out":
      await db.delete(sessions).where(eq(sessions.userId, u.id));
      await log("Signed out everywhere");
      break;
    default:
      return json({ error: "Unknown action." }, 400);
  }
  return json({ ok: true });
}
