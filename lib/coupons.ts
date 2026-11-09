import "server-only";
import { eq, sql } from "drizzle-orm";
import { coupons, db } from "@/db";
import { PLANS, type PlanId } from "@/lib/plans";

export const normCode = (c: unknown) => String(c ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);

/** A code that can be used now, or the reason it can't. */
export async function usableCoupon(code: unknown): Promise<{ code: string; percent: number } | { error: string }> {
  const c = normCode(code);
  if (!c) return { error: "Enter a code." };
  const [row] = await db.select().from(coupons).where(eq(coupons.code, c));
  if (!row || !row.active) return { error: "That code isn't valid." };
  if (row.expiresAt && row.expiresAt < new Date()) return { error: "That code has expired." };
  if (row.maxUses != null && row.uses >= row.maxUses) return { error: "That code has been used up." };
  return { code: row.code, percent: row.percent };
}

/** The price in paise after a percentage off (whole rupees, at least ₹1). */
export const discounted = (plan: PlanId, percent: number) => Math.max(1, Math.round((PLANS[plan].priceInr * (100 - percent)) / 100)) * 100;

/** One more use of a code (when its payment is applied). */
export async function countUse(code: string) {
  await db.update(coupons).set({ uses: sql`${coupons.uses} + 1` }).where(eq(coupons.code, code));
}
