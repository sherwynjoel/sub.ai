import { db, billingEvents } from "@/db";
import { json } from "@/lib/auth";
import { applySubscription, hmacOk } from "@/lib/razorpay";

/** Razorpay webhook (Dashboard → Webhooks → <APP_URL>/api/billing/webhook, subscription.* events). */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!hmacOk(raw, req.headers.get("x-razorpay-signature"))) return json({ error: "bad signature" }, 400);
  const evt = JSON.parse(raw);
  const id = req.headers.get("x-razorpay-event-id") || `${evt.event}:${evt.created_at}:${evt.payload?.subscription?.entity?.id}`;
  const fresh = await db.insert(billingEvents).values({ id, type: evt.event, payload: evt }).onConflictDoNothing().returning();
  if (!fresh.length) return json({ ok: true, duplicate: true });
  const sub = evt.payload?.subscription?.entity;
  if (sub && String(evt.event).startsWith("subscription.")) await applySubscription(sub, evt.event === "subscription.charged");
  return json({ ok: true });
}
