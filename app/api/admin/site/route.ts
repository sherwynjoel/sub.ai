import { json } from "@/lib/auth";
import { adminOrNull, logAdmin } from "@/lib/admin";
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
  return json({ error: "Unknown action." }, 400);
}
