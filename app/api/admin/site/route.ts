import { json } from "@/lib/auth";
import { adminOrNull, logAdmin } from "@/lib/admin";
import { BRAND } from "@/lib/brand";
import { emailReady } from "@/lib/email";
import { emailAdmins } from "@/lib/health";
import { setAiCostPerMin } from "@/lib/money";
import { PRICE_FIELDS, savePriceBook, type Price } from "@/lib/aiPrices";
import { INVITE_MAX, saveInviteSettings } from "@/lib/referral";

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
  if (b.action === "ai_prices") {
    const usdInr = Number(b.usdInr);
    if (!(usdInr >= 1 && usdInr <= 1000)) return json({ error: "Enter the dollar rate in ₹, e.g. 88." }, 400);
    const prices: Record<string, Price> = {};
    for (const [model, raw] of Object.entries((b.prices ?? {}) as Record<string, Partial<Price>>).slice(0, 100)) {
      const name = model.trim().slice(0, 80);
      if (!name) continue;
      const p: Price = { cur: raw?.cur === "INR" ? "INR" : "USD" };
      for (const f of PRICE_FIELDS) {
        if (raw?.[f] == null) continue;
        const v = Number(raw[f]);
        if (!Number.isFinite(v) || v < 0 || v > 1e6) return json({ error: `Check the price for ${name}.` }, 400);
        p[f] = v;
      }
      prices[name] = p;
    }
    await savePriceBook({ usdInr, prices });
    await logAdmin(me, "Set AI prices", `$1 = ₹${usdInr}, ${Object.keys(prices).length} models`);
    return json({ ok: true });
  }
  if (b.action === "invite_settings") {
    const upTo = Number(b.upTo);
    if (!(Number.isInteger(upTo) && upTo >= 0 && upTo <= INVITE_MAX)) return json({ error: `Enter whole minutes from 0 to ${INVITE_MAX}.` }, 400);
    await saveInviteSettings({ on: !!b.on, upTo, message: String(b.message ?? "") });
    await logAdmin(me, b.on ? "Invites on" : "Invites off", `up to ${upTo} min per approved friend`);
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
