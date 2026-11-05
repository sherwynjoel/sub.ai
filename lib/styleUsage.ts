import { and, eq, sql, type AnyColumn } from "drizzle-orm";
import type { db } from "@/db";
import { jobs, styleEvents, users } from "@/db/schema";
import { CAPTION_STYLES, DEFAULT_STYLE, POPULAR, STYLE_CHOICES } from "@/lib/captionStyles";

export type StyleCount = { style: string; projects: number; people: number; videos: number; last: string | null };
export type StyleUse = StyleCount & { name: string; group: string; share: number; tags: string[] };
/** One person's use of one style. */
export type UseRow = { style: string; user: string; n: number; last: string | null };
type Job = { id: string; userId: string; status: string; captionStyle: string; createdAt: Date };
type Database = Pick<typeof db, "select" | "insert">;

/** A finished video export, under the style it was made in. Never in the way of the export itself. */
export const recordExport = (database: Database, job: Job) =>
  database.insert(styleEvents).values({ kind: "export", style: job.captionStyle, jobId: job.id, userId: job.userId }).catch(console.error);

/** A finished project about to be deleted: it still counts as having used its style. */
export const recordDeleted = async (database: Database, job: Job) => {
  if (job.status === "done") await database.insert(styleEvents).values({ kind: "project_deleted", style: job.captionStyle, jobId: job.id, userId: job.userId, at: job.createdAt }).catch(console.error);
};

/** Rows per style: projects and exports added up, each person counted once. */
export function mergeCounts(projects: UseRow[], exports: UseRow[]): StyleCount[] {
  const out = new Map<string, StyleCount & { who: Set<string> }>();
  const add = (r: UseRow, key: "projects" | "videos") => {
    const c = out.get(r.style) ?? { style: r.style, projects: 0, people: 0, videos: 0, last: null, who: new Set<string>() };
    c[key] += r.n;
    c.who.add(r.user);
    if (r.last && (!c.last || Date.parse(r.last) > Date.parse(c.last))) c.last = r.last;
    out.set(r.style, c);
  };
  projects.forEach((r) => add(r, "projects"));
  exports.forEach((r) => add(r, "videos"));
  return [...out.values()].map(({ who, ...c }) => ({ ...c, people: who.size }));
}

/** Finished projects (deleted ones too) under the style each uses, and every finished export under the style it was made in. */
export async function styleCounts(database: Pick<typeof db, "select">, { recent = false, customers = false } = {}) {
  const notAdmin = customers ? sql`coalesce(${users.isAdmin}, false) = false` : undefined; // (a deleted account isn't one)
  const since = (at: AnyColumn) => (recent ? sql`${at} > now() - interval '30 days'` : undefined);
  const n = sql<number>`count(*)::int`;
  const events = (kind: string) => database.select({ style: styleEvents.style, user: styleEvents.userId, n, last: sql<string | null>`max(${styleEvents.at})::text` })
    .from(styleEvents).leftJoin(users, eq(users.id, styleEvents.userId))
    .where(and(eq(styleEvents.kind, kind), notAdmin, since(styleEvents.at)))
    .groupBy(styleEvents.style, styleEvents.userId);
  const [live, deleted, exported] = await Promise.all([
    database.select({ style: jobs.captionStyle, user: jobs.userId, n, last: sql<string | null>`max(${jobs.createdAt})::text` })
      .from(jobs).leftJoin(users, eq(users.id, jobs.userId))
      .where(and(eq(jobs.status, "done"), notAdmin, since(jobs.createdAt)))
      .groupBy(jobs.captionStyle, jobs.userId),
    events("project_deleted"),
    events("export"),
  ]);
  return mergeCounts([...live, ...deleted], exported);
}

/** Projects a style needs before it can take a place on the home page from the hand-picked ones. */
const PROVEN = 3;

/** The home page's most popular styles: what people use most, then the hand-picked ones until there's enough to go on. */
export function topStyles(counts: StyleCount[], n = 8) {
  const proven = styleTable(counts).used.filter((u) => u.projects >= PROVEN && !u.tags.includes("No longer offered")).map((u) => u.style);
  return [...new Set([...proven, ...POPULAR])].slice(0, n);
}

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
  return { total, videos: counts.reduce((n, c) => n + c.videos, 0), used, unused };
}
