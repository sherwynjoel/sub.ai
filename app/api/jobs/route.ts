import { desc, eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { publicJob } from "@/lib/jobs";

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const rows = await db.select().from(jobs).where(eq(jobs.userId, u.id)).orderBy(desc(jobs.createdAt)).limit(100);
  return json(rows.map((j) => publicJob(j)));
}
