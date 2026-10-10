import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { and, eq, sql } from "drizzle-orm";
import { db, jobs, users } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { probe, STORAGE } from "@/lib/media";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/languages";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";

const MAX_BYTES = 4 * 1024 ** 3; // 4 GB

/** Raw-body upload: `POST /api/upload?name=clip.mp4&lang=ta-IN` with the file as the body (streamed to disk). */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  if (secondsLeft(u) <= 0) return json({ error: "You've used all your minutes. Upgrade your plan to continue." }, 402);
  if (!req.body) return json({ error: "No file received." }, 400);

  const q = new URL(req.url).searchParams;
  const name = (q.get("name") || "video").slice(0, 200);
  const lang = q.get("lang") ?? DEFAULT_LANGUAGE;
  if (!isLanguage(lang)) return json({ error: "Unsupported subtitle language." }, 400);
  const dir = join(STORAGE, "uploads", u.id);
  await mkdir(dir, { recursive: true });
  const path = join(dir, randomUUID() + (extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp4"));

  let bytes = 0;
  const limit = new Transform({
    transform(chunk, _e, cb) {
      bytes += chunk.length;
      cb(bytes > MAX_BYTES ? new Error("too large") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as never), limit, createWriteStream(path));
  } catch {
    await unlink(path).catch(() => {});
    return json({ error: bytes > MAX_BYTES ? "File is larger than 4 GB." : "Upload interrupted." }, 400);
  }

  const duration = await probe(path);
  if (!duration) {
    await unlink(path).catch(() => {});
    return json({ error: "That file has no audio track we can read." }, 400);
  }
  // Charge minutes atomically so two parallel uploads can't overspend the quota.
  const quota = PLANS[effectivePlan(u)].minutes * 60;
  const secs = Math.ceil(duration);
  const charged = await db
    .update(users)
    .set({ secondsUsed: sql`${users.secondsUsed} + ${secs}` })
    .where(and(eq(users.id, u.id), sql`${users.secondsUsed} + ${secs} <= ${quota}`))
    .returning({ id: users.id });
  if (!charged.length) {
    await unlink(path).catch(() => {});
    return json({ error: `This video is ${Math.ceil(duration / 60)} min but you have ${Math.floor(secondsLeft(u) / 60)} min left. Upgrade to continue.` }, 402);
  }
  const mime = req.headers.get("content-type")?.startsWith("video/") || req.headers.get("content-type")?.startsWith("audio/") ? req.headers.get("content-type")! : "video/mp4";
  const [job] = await db.insert(jobs).values({ userId: u.id, filename: name, filePath: path, durationSec: duration, mime, language: lang }).returning();
  return json({ id: job.id, durationSec: duration }, 201);
}
