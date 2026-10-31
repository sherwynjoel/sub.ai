import { createWriteStream } from "node:fs";
import { mkdir, open, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { and, eq, sql } from "drizzle-orm";
import { db, jobs, stylePresets, users } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { probe, remuxAudio, soundLength, STORAGE, videoPart } from "@/lib/media";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/languages";
import { JOB_SCRIPTS, type JobScript } from "@/lib/captionTypes";
import { DEFAULT_STYLE, SAFE_ZONES, STYLE_CHOICES } from "@/lib/captionStyles";
import { effectivePlan, PLANS, secondsLeft } from "@/lib/plans";
import { mustConfirm } from "@/lib/verify";
import { knownStyle, presetLook } from "@/lib/presets";

const MAX_BYTES = 4 * 1024 ** 3; // 4 GB

/**
 * Raw-body upload: `POST /api/upload?name=clip.mp4&lang=ta-IN` with the file as the body (streamed to disk).
 * Phones send the sound first: `&audio=1&videoBytes=N&videoType=video/quicktime` with the AAC track as the body
 * (lib/audioTrack.ts); captioning starts from it and the video follows in pieces (api/jobs/[id]/video).
 */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  if (await mustConfirm(u)) return json({ error: `Confirm your email to start your free minutes: open the link we sent to ${u.email}.`, confirm: true }, 403);
  if (secondsLeft(u) <= 0) return json({ error: "You've used all your minutes. Upgrade your plan to continue." }, 402);
  if (!req.body) return json({ error: "No file received." }, 400);

  const q = new URL(req.url).searchParams;
  const name = (q.get("name") || "video").slice(0, 200);
  const lang = q.get("lang") ?? DEFAULT_LANGUAGE;
  if (!isLanguage(lang)) return json({ error: "Unsupported subtitle language." }, 400);
  const script = (JOB_SCRIPTS as readonly string[]).includes(q.get("script") ?? "") ? (q.get("script") as JobScript) : "mixed";
  // show: which lines the subtitles show; English only still needs the English pass.
  const show = q.get("show") === "en" || q.get("show") === "ta" ? (q.get("show") as "en" | "ta") : undefined;
  const withEnglish = show === "en" || q.get("english") !== "0";
  const safe = q.get("safe") ?? "";
  const picked = { ...(safe in SAFE_ZONES && safe !== "none" && safe !== "custom" ? { safe: safe as keyof typeof SAFE_ZONES } : {}), ...(show ? { show } : {}) };
  // No style chosen with the upload: the user's default preset ("My brand"), with the upload's own choices on top.
  const [preset] = q.get("style") ? [] : await db.select().from(stylePresets).where(and(eq(stylePresets.userId, u.id), eq(stylePresets.isDefault, true))).limit(1);
  const captionStyle = STYLE_CHOICES.some((s) => s.id === q.get("style")) ? q.get("style")! : preset && knownStyle(preset.styleId) ? preset.styleId : DEFAULT_STYLE;
  const captionCustom = { ...(preset ? presetLook(preset.custom) : {}), ...picked };
  const dir = join(STORAGE, "uploads", u.id);
  await mkdir(dir, { recursive: true });
  const audioFirst = q.get("audio") === "1";
  const videoBytes = Number(q.get("videoBytes"));
  if (audioFirst && !(videoBytes > 0 && videoBytes <= MAX_BYTES)) return json({ error: "File is larger than 4 GB." }, 400);
  const path = join(dir, randomUUID() + (audioFirst ? ".aac" : extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp4"));

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

  let source = path;
  if (audioFirst) { // raw AAC has no exact length: repackage it (a copy)
    source = path.replace(/\.aac$/, ".m4a");
    const shift = Math.max(-5, Math.min(5, Number(q.get("shift")) || 0)); // the video's edit list (lib/audioTrack.ts)
    const ok = await remuxAudio(path, source, shift).then(() => true, () => false);
    await unlink(path).catch(() => {});
    if (!ok) return json({ error: "That file has no audio track we can read." }, 400);
  }
  // The longer of what the file states and its sound counted out (a file can state less than it holds).
  const stated = await probe(source), counted = stated ? await soundLength(source) : null;
  const duration = stated && Math.max(stated, counted ?? 0);
  if (!duration) {
    await unlink(source).catch(() => {});
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
    await unlink(source).catch(() => {});
    return json({ error: `This video is ${Math.ceil(duration / 60)} min but you have ${Math.floor(secondsLeft(u) / 60)} min left. Upgrade to continue.` }, 402);
  }
  const type = audioFirst ? q.get("videoType") ?? "" : req.headers.get("content-type") ?? "";
  const mime = type.startsWith("video/") || type.startsWith("audio/") ? type : "video/mp4";
  const [job] = await db.insert(jobs).values({
    userId: u.id, filename: name, durationSec: duration, mime, language: lang, script, withEnglish, captionStyle, captionCustom,
    ...(audioFirst ? { audioPath: source, videoTotal: videoBytes } : { filePath: path }),
  }).returning();
  if (audioFirst) { // the file the pieces are written into, at full size up front (sparse) so they can land in any order
    const { file } = videoPart(dir, job.id);
    const h = await open(file, "w");
    await h.truncate(videoBytes);
    await h.close();
  }
  return json({ id: job.id, durationSec: duration }, 201);
}
