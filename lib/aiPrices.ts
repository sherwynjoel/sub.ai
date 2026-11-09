import "server-only";
import { desc, eq, gt, inArray, sql } from "drizzle-orm";
import { aiUsage, db, jobs, settings } from "@/db";
import type { Usage } from "@/lib/ai/usage";

/**
 * What each model charges, per unit, in its own currency. Defaults are the published list prices (Nov 2026); the
 * admin can change any of them (and add a model) on the AI cost page.
 */
export type Price = {
  cur: "USD" | "INR";
  /** per 1M text input tokens */
  inM?: number;
  /** per 1M audio input tokens */
  audioM?: number;
  /** per 1M output tokens (thinking included) */
  outM?: number;
  /** per hour of audio */
  audioHour?: number;
  /** per 10,000 characters */
  chars10k?: number;
};

export const DEFAULT_PRICES: Record<string, Price> = {
  "gemini-2.5-flash": { cur: "USD", inM: 0.3, audioM: 1, outM: 2.5 },
  "gemini-2.5-flash-lite": { cur: "USD", inM: 0.1, audioM: 0.3, outM: 0.4 },
  "gemini-2.5-pro": { cur: "USD", inM: 1.25, audioM: 1.25, outM: 10 },
  "saaras:v4": { cur: "INR", audioHour: 30 },
  "saaras:v3": { cur: "INR", audioHour: 30 },
  "mayura:v1": { cur: "INR", chars10k: 20 },
  "sarvam-translate:v1": { cur: "INR", chars10k: 20 },
  "whisper-1": { cur: "USD", audioHour: 0.36 },
  "gpt-4.1-mini": { cur: "USD", inM: 0.4, outM: 1.6 },
  "whisper-large-v3-turbo": { cur: "USD", audioHour: 0.04 },
  "llama-3.3-70b-versatile": { cur: "USD", inM: 0.59, outM: 0.79 },
};
export const DEFAULT_USD_INR = 88;
export const PRICE_FIELDS = ["inM", "audioM", "outM", "audioHour", "chars10k"] as const;

const KEY = "ai_prices";

export type PriceBook = { usdInr: number; prices: Record<string, Price> };

/** The defaults with the admin's changes on top. */
export async function priceBook(): Promise<PriceBook> {
  const [r] = await db.select().from(settings).where(eq(settings.key, KEY));
  let saved: Partial<PriceBook> = {};
  try { saved = r ? JSON.parse(r.value) : {}; } catch { /* a broken value: the defaults */ }
  return { usdInr: Number(saved.usdInr) > 0 ? Number(saved.usdInr) : DEFAULT_USD_INR, prices: { ...DEFAULT_PRICES, ...(saved.prices ?? {}) } };
}

export async function savePriceBook(book: PriceBook) {
  const value = JSON.stringify(book);
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** A model's price, also for dated names ("gemini-2.5-flash-preview-05-20" uses "gemini-2.5-flash"). */
export function priceOf(book: PriceBook, model: string): Price | undefined {
  if (book.prices[model]) return book.prices[model];
  const base = Object.keys(book.prices).filter((k) => model.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return base ? book.prices[base] : undefined;
}

/** What some usage cost in ₹, or null when the model has no price. */
export function costInr(book: PriceBook, u: Omit<Usage, "kind" | "provider">): number | null {
  const p = priceOf(book, u.model);
  if (!p) return null;
  const native = ((u.inTok ?? 0) * (p.inM ?? 0) + (u.audioTok ?? 0) * (p.audioM ?? p.inM ?? 0) + (u.outTok ?? 0) * (p.outM ?? 0)) / 1e6
    + ((u.audioSec ?? 0) / 3600) * (p.audioHour ?? 0)
    + ((u.chars ?? 0) / 1e4) * (p.chars10k ?? 0);
  return p.cur === "USD" ? native * book.usdInr : native;
}

type Sums = { audioSec: number; inTok: number; audioTok: number; outTok: number; chars: number };
const SUMS = {
  audioSec: sql<number>`coalesce(sum(${aiUsage.audioSec}), 0)::float`, inTok: sql<number>`coalesce(sum(${aiUsage.inTok}), 0)::float`,
  audioTok: sql<number>`coalesce(sum(${aiUsage.audioTok}), 0)::float`, outTok: sql<number>`coalesce(sum(${aiUsage.outTok}), 0)::float`,
  chars: sql<number>`coalesce(sum(${aiUsage.chars}), 0)::float`,
};

/**
 * The AI cost page: what the AI cost (measured, ₹) and the cost per minute of video, by month, by model, and for the
 * latest videos. A model without a price counts as ₹0 and is listed under `unpriced`.
 */
export async function aiCostStats() {
  const book = await priceBook(), year = new Date(Date.now() - 400 * 864e5);
  const month = sql<string>`to_char(${aiUsage.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM')`;
  const [byModelMonth, runsByMonth, recentRuns, first] = await Promise.all([
    db.select({ m: month, kind: aiUsage.kind, provider: aiUsage.provider, model: aiUsage.model, ...SUMS })
      .from(aiUsage).where(gt(aiUsage.createdAt, year)).groupBy(sql`1`, aiUsage.kind, aiUsage.provider, aiUsage.model),
    // Each run counts its video's length once, however many models it used.
    db.execute(sql`SELECT m, kind, count(*)::int AS runs, coalesce(sum(v), 0)::float AS sec FROM (
        SELECT to_char(min(created_at) at time zone 'Asia/Kolkata', 'YYYY-MM') AS m, min(kind) AS kind, max(video_sec) AS v
        FROM ai_usage WHERE created_at > ${year.toISOString()}::timestamptz GROUP BY run) r GROUP BY m, kind`),
    db.select({ run: aiUsage.run, at: sql<Date>`min(${aiUsage.createdAt})`, jobId: sql<string | null>`min(${aiUsage.jobId}::text)`, kind: sql<string>`min(${aiUsage.kind})`,
      videoSec: sql<number>`max(${aiUsage.videoSec})::float`, rows: sql<Omit<Usage, "kind" | "provider">[]>`json_agg(json_build_object('model', ${aiUsage.model}, 'audioSec', ${aiUsage.audioSec}, 'inTok', ${aiUsage.inTok}, 'audioTok', ${aiUsage.audioTok}, 'outTok', ${aiUsage.outTok}, 'chars', ${aiUsage.chars}))`,
      providers: sql<string>`string_agg(distinct ${aiUsage.provider}, ', ')` })
      .from(aiUsage).groupBy(aiUsage.run).orderBy(desc(sql`min(${aiUsage.createdAt})`)).limit(25),
    db.select({ at: sql<Date | null>`min(${aiUsage.createdAt})` }).from(aiUsage),
  ]);
  const unpriced = new Set<string>();
  const price = (u: Sums & { model: string }) => { const c = costInr(book, u); if (c === null) unpriced.add(u.model); return c ?? 0; };

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const empty = () => ({ cost: 0, sec: 0, runs: 0 });
  const byMonth = new Map(months.map((m) => [m, { m, subtitles: empty(), translate: empty() }]));
  const models = new Map<string, { kind: string; provider: string; model: string; cost: number; sums: Sums }>();
  const thisMonth = months.at(-1)!;
  for (const r of byModelMonth) {
    const c = price(r), row = byMonth.get(r.m);
    if (row) row[r.kind === "translate" ? "translate" : "subtitles"].cost += c;
    if (r.m !== thisMonth) continue;
    const k = `${r.kind}|${r.model}`, t = models.get(k) ?? { kind: r.kind, provider: r.provider, model: r.model, cost: 0, sums: { audioSec: 0, inTok: 0, audioTok: 0, outTok: 0, chars: 0 } };
    t.cost += c;
    for (const f of ["audioSec", "inTok", "audioTok", "outTok", "chars"] as const) t.sums[f] += r[f];
    models.set(k, t);
  }
  for (const r of runsByMonth as unknown as { m: string; kind: string; runs: number; sec: number }[]) {
    const row = byMonth.get(r.m); if (!row) continue;
    const part = row[r.kind === "translate" ? "translate" : "subtitles"];
    part.runs += r.runs; part.sec += r.sec;
  }
  const perMin = (p: { cost: number; sec: number }) => (p.sec > 0 ? p.cost / (p.sec / 60) : null);
  return {
    since: first[0]?.at ? new Date(first[0].at) : null,
    usdInr: book.usdInr,
    months: [...byMonth.values()].map((r) => ({ ...r, total: r.subtitles.cost + r.translate.cost, perMin: perMin(r.subtitles), translatePerMin: perMin(r.translate) })),
    models: [...models.values()].sort((a, b) => b.cost - a.cost),
    recent: recentRuns.map((r) => {
      const cost = r.rows.reduce((a, u) => a + price({ audioSec: 0, inTok: 0, audioTok: 0, outTok: 0, chars: 0, ...u }), 0);
      return { at: new Date(r.at), jobId: r.jobId, kind: r.kind, providers: r.providers, videoSec: r.videoSec, cost, perMin: r.videoSec > 0 ? cost / (r.videoSec / 60) : null };
    }),
    unpriced: [...unpriced],
    book,
  };
}

/** Measured AI cost (₹) per month "YYYY-MM", for the Revenue page's profit; months before measuring started are absent. */
export async function measuredCostByMonth(): Promise<Map<string, number>> {
  const s = await aiCostStats();
  return new Map(s.months.filter((m) => m.subtitles.runs + m.translate.runs > 0).map((m) => [m.m, m.total]));
}

/** File names of the latest jobs, for the AI cost page's list. */
export async function jobNames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await db.select({ id: jobs.id, name: jobs.filename }).from(jobs).where(inArray(jobs.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}
