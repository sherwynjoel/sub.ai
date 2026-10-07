import { eq, sql } from "drizzle-orm";
import { db, sessions, users } from "@/db";
import { json } from "@/lib/auth";
import { adminOrNull } from "@/lib/admin";
import { PLANS, type PlanId } from "@/lib/plans";

/** Admin account actions. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminOrNull();
  if (!me) return json({ error: "Admins only." }, 403);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const [u] = /^[0-9a-f-]{36}$/.test(id) ? await db.select().from(users).where(eq(users.id, id)) : [];
  if (!u) return json({ error: "User not found." }, 404);
  const where = eq(users.id, u.id);

  switch (b.action) {
    case "reset_usage":
      await db.update(users).set({ secondsUsed: 0 }).where(where);
      break;
    case "add_minutes": {
      const m = Math.round(Number(b.minutes));
      if (!Number.isFinite(m) || m === 0 || Math.abs(m) > 100000) return json({ error: "Enter a number of minutes." }, 400);
      // Bonus minutes = less usage counted (can go negative, which works as credit).
      await db.update(users).set({ secondsUsed: sql`${users.secondsUsed} - ${m * 60}` }).where(where);
      break;
    }
    case "set_plan": {
      const plan = b.plan as PlanId;
      const days = Math.round(Number(b.days));
      if (!(plan in PLANS) || (plan !== "free" && !(days > 0 && days <= 3660))) return json({ error: "Pick a plan and number of days." }, 400);
      // Manual/complimentary plan; a Razorpay subscription will overwrite it on its next charge.
      await db.update(users).set({ plan, periodEnd: plan === "free" ? null : new Date(Date.now() + days * 864e5), secondsUsed: 0 }).where(where);
      break;
    }
    case "set_admin":
      if (u.id === me.id) return json({ error: "You can't change your own admin access." }, 400);
      await db.update(users).set({ isAdmin: !!b.value }).where(where);
      break;
    case "sign_out":
      await db.delete(sessions).where(eq(sessions.userId, u.id));
      break;
    default:
      return json({ error: "Unknown action." }, 400);
  }
  return json({ ok: true });
}
