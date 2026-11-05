import { and, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { CAPTION_STYLES, DEFAULT_STYLE, POPULAR, STYLE_CHOICES } from "@/lib/captionStyles";

export type StyleCount = { style: string; projects: number; people: number; videos: number; last: string | null };
export type StyleUse = StyleCount & { name: string; group: string; share: number; tags: string[] };

/** Per style: finished projects, the people behind them, the videos exported. Admins' own test projects aren't counted. */
export const styleCounts = (database: Pick<typeof db, "select">, recent = false): Promise<StyleCount[]> =>
  database.select({
    style: jobs.captionStyle,
    projects: sql<number>`count(*)::int`,
    people: sql<number>`count(distinct ${jobs.userId})::int`,
    videos: sql<number>`(count(*) filter (where ${jobs.renderStatus} in ('done', 'stale')))::int`,
    last: sql<string | null>`max(${jobs.createdAt})::text`,
  }).from(jobs).innerJoin(users, eq(users.id, jobs.userId))
    .where(and(eq(jobs.status, "done"), eq(users.isAdmin, false), recent ? sql`${jobs.createdAt} > now() - interval '30 days'` : undefined))
    .groupBy(jobs.captionStyle);

/** The counts, most used first, and the styles on offer that nobody has used. */
export function styleTable(counts: StyleCount[]) {
  const total = counts.reduce((n, c) => n + c.projects, 0);
  const used: StyleUse[] = counts.map((c) => {
    const s = CAPTION_STYLES.find((x) => x.id === c.style);
    const tags = [
      ...(c.style === DEFAULT_STYLE ? ["Default"] : []),
      ...(POPULAR.includes(c.style) ? ["Shown first"] : []),
      ...(STYLE_CHOICES.some((x) => x.id === c.style) ? [] : ["No longer offered"]),
    ];
    return { ...c, name: s?.name ?? c.style, group: s?.group ?? "", share: total ? c.projects / total : 0, tags };
  }).sort((a, b) => b.projects - a.projects || b.videos - a.videos || a.name.localeCompare(b.name));
  const unused = STYLE_CHOICES.filter((s) => !counts.some((c) => c.style === s.id));
  return { total, used, unused };
}
