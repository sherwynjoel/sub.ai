import "server-only";
import { and, eq, gt, isNotNull, isNull, lt, ne, sql, type SQL } from "drizzle-orm";
import { db, jobs, settings, users } from "@/db";
import { BRAND, BUSINESS } from "@/lib/brand";
import { sendEmail } from "@/lib/email";
import { sign } from "@/lib/secrets";
import { SITE_URL } from "@/lib/site";

/* ---------- The announcement bar ---------- */

export type Announcement = { text: string; link?: string; linkText?: string; until?: string };
const ANN_KEY = "announcement";

/** The message shown at the top of the app, while it's switched on and not past its end date. */
export async function announcement(): Promise<Announcement | null> {
  const [r] = await db.select().from(settings).where(eq(settings.key, ANN_KEY)).catch(() => []);
  if (!r) return null;
  try {
    const a = JSON.parse(r.value) as Announcement;
    if (!a.text || (a.until && new Date(a.until) < new Date())) return null;
    return a;
  } catch { return null; }
}
export async function rawAnnouncement(): Promise<Announcement | null> {
  const [r] = await db.select().from(settings).where(eq(settings.key, ANN_KEY));
  try { return r ? JSON.parse(r.value) : null; } catch { return null; }
}
export async function setAnnouncement(a: Announcement | null) {
  if (!a) { await db.delete(settings).where(eq(settings.key, ANN_KEY)); return; }
  await db.insert(settings).values({ key: ANN_KEY, value: JSON.stringify(a) }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(a) } });
}

/* ---------- Emails to a group of users ---------- */

/** Who an email can go to. The free trial is "free"; a pass is live while period_end is ahead. */
export const GROUPS = {
  all: "Everyone",
  paid: "Paying now (pass running)",
  trial: "On the free trial",
  ending: "Pass ends in the next 7 days",
  ended: "Paid before, pass has ended",
  idle: "Signed up but never made a video",
} as const;
export type Group = keyof typeof GROUPS;

function groupWhere(g: Group): SQL | undefined {
  const live = and(ne(users.plan, "free"), isNotNull(users.periodEnd), gt(users.periodEnd, new Date()));
  switch (g) {
    case "all": return undefined;
    case "paid": return live;
    case "trial": return eq(users.plan, "free");
    case "ending": return and(live, lt(users.periodEnd, new Date(Date.now() + 7 * 864e5)));
    case "ended": return and(ne(users.plan, "free"), isNotNull(users.periodEnd), lt(users.periodEnd, new Date()));
    case "idle": return sql`not exists (select 1 from ${jobs} where ${jobs.userId} = ${users.id})`;
  }
}

/** The people in a group who haven't unsubscribed (blocked accounts left out). */
export async function groupMembers(g: Group) {
  const where = and(groupWhere(g), eq(users.noNews, false), isNull(users.blockedAt));
  return db.select({ id: users.id, email: users.email, name: users.name, periodEnd: users.periodEnd, plan: users.plan, createdAt: users.createdAt }).from(users).where(where);
}

export const unsubLink = (userId: string) => `${SITE_URL}/api/unsubscribe?u=${userId}&s=${sign(`unsub:${userId}`)}`;
export const unsubOk = (userId: string, s: string) => s === sign(`unsub:${userId}`);

/** Gmail sends about 500 a day: one send is capped below that. */
export const MAX_PER_SEND = 400;

/** Sends one email to each person, one after another (in the background); {name} becomes their first name. */
export async function sendNews(people: { id: string; email: string; name: string }[], subject: string, body: string) {
  for (const p of people.slice(0, MAX_PER_SEND)) {
    const first = p.name.split(/\s+/)[0] || "there";
    const text = `${body.replaceAll("{name}", first)}\n\n${BRAND.name}\n${BUSINESS.email}\n\nDon't want these emails? ${unsubLink(p.id)}`;
    await sendEmail(p.email, subject, text).catch(() => {}); // logged in the email log either way
    await new Promise((r) => setTimeout(r, 1200)); // gentle on Gmail
  }
}
