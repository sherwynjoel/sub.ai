import { json } from "@/lib/auth";
import { adminOrNull, logAdmin } from "@/lib/admin";
import { BRAND } from "@/lib/brand";
import { emailReady } from "@/lib/email";
import { emailAdmins } from "@/lib/health";
import { setAiCostPerMin } from "@/lib/money";

/** Site-wide admin settings. */
export async function POST(req: Request) {
  const me = await adminOrNull();
  if (!me) return json({ error: "Admins only." }, 403);
  const b = await req.json().catch(() => ({}));
  if (b.action === "ai_cost") {
    const r = Number(b.rupees);
    if (!Number.isFinite(r) || r < 0 || r > 1000) return json({ error: "Enter the cost in ₹ per minute, e.g. 0.50." }, 400);
    await setAiCostPerMin(Math.round(r * 100) / 100);
    await logAdmin(me, "Set AI cost per minute", `₹${r}`);
    return json({ ok: true });
  }
  if (b.action === "test_alert") {
    if (!(await emailReady())) return json({ error: "Email isn't set up, so alerts can't be sent." }, 400);
    const n = await emailAdmins(`${BRAND.name}: test alert`, `This is a test. When something breaks on the site, an email like this one tells you what.\n\nSent by ${me.email}.`);
    await logAdmin(me, "Sent a test alert");
    return json({ ok: true, n });
  }
  return json({ error: "Unknown action." }, 400);
}
