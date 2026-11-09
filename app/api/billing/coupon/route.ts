import { currentUser, json, rateLimited, unauthorized } from "@/lib/auth";
import { discounted, usableCoupon } from "@/lib/coupons";
import { PAID } from "@/lib/plans";

/** Checks a discount code and says what each plan costs with it. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  if (rateLimited(`coupon:${u.id}`, 20, 60 * 60e3)) return json({ error: "Too many tries. Try again in an hour." }, 429);
  const { code } = await req.json().catch(() => ({}));
  const c = await usableCoupon(code);
  if ("error" in c) return json({ error: c.error }, 400);
  return json({ code: c.code, percent: c.percent, prices: Object.fromEntries(PAID.map((p) => [p, discounted(p, c.percent) / 100])) });
}
