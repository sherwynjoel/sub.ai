import { mkdir, open, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { STORAGE, VIDEO_PIECE, videoPart } from "@/lib/media";

/**
 * A video arriving in pieces after its sound (see api/upload): pieces of VIDEO_PIECE bytes, several at once and in
 * any order, each written at its place in the file; a dropped piece is simply sent again, and a page reopened later
 * asks which pieces are here and sends the rest.
 *   GET  → { total, piece, have: [indexes] }
 *   PUT  ?i=N  (body: piece N)
 *   POST → all pieces here: the video becomes the project's
 */
type Ctx = { params: Promise<{ id: string }> };

async function pending(ctx: Ctx) {
  const u = await currentUser();
  if (!u) return { error: unauthorized() };
  const j = await ownJob((await ctx.params).id, u);
  if (!j) return { error: json({ error: "Not found" }, 404) };
  if (!j.videoTotal) return { error: json({ error: j.filePath ? "The video is already here." : "This project isn't waiting for a video." }, 409) };
  const dir = join(STORAGE, "uploads", u.id);
  return { j, total: j.videoTotal, count: Math.ceil(j.videoTotal / VIDEO_PIECE), ...videoPart(dir, j.id) };
}
const received = async (got: string) => (await readdir(/*turbopackIgnore: true*/ got).catch(() => [] as string[])).map(Number).filter(Number.isInteger).sort((a, b) => a - b);

export async function GET(_req: Request, ctx: Ctx) {
  const p = await pending(ctx);
  if (p.error) return p.error;
  return json({ total: p.total, piece: VIDEO_PIECE, have: await received(p.got) });
}

export async function PUT(req: Request, ctx: Ctx) {
  const p = await pending(ctx);
  if (p.error) return p.error;
  const i = Number(new URL(req.url).searchParams.get("i"));
  if (!Number.isInteger(i) || i < 0 || i >= p.count) return json({ error: "Bad piece." }, 400);
  const want = Math.min(VIDEO_PIECE, p.total - i * VIDEO_PIECE);
  const body = new Uint8Array(await req.arrayBuffer());
  if (body.length !== want) return json({ error: `Piece ${i} should be ${want} bytes, got ${body.length}.` }, 400);
  const h = await open(/*turbopackIgnore: true*/ p.file, "r+");
  try { await h.write(body, 0, body.length, i * VIDEO_PIECE); } finally { await h.close(); }
  await mkdir(/*turbopackIgnore: true*/ p.got, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ p.got, String(i)), ""); // marked only once written
  return json({ ok: true });
}

export async function POST(_req: Request, ctx: Ctx) {
  const p = await pending(ctx);
  if (p.error) return p.error;
  const have = await received(p.got);
  if (have.length !== p.count) return json({ error: "Some pieces are missing.", have }, 409);
  const ext = extname(p.j.filename).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp4";
  const path = join(/*turbopackIgnore: true*/ dirname(p.file), `${p.j.id}${ext}`);
  await rename(/*turbopackIgnore: true*/ p.file, path);
  await rm(/*turbopackIgnore: true*/ p.got, { recursive: true, force: true });
  await db.update(jobs).set({ filePath: path, videoTotal: null }).where(eq(jobs.id, p.j.id));
  return json({ ok: true });
}
