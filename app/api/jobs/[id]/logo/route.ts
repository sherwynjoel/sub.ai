import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { sanitizeCustom } from "@/lib/captionStyles";
import { ownJob } from "@/lib/jobs";
import { logoPath } from "@/lib/render";

type Ctx = { params: Promise<{ id: string }> };
const TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;
const MAX = 2 * 1024 * 1024;

/** The project's logo image. */
export async function GET(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  const l = j?.captionCustom?.logo;
  if (!j || !l) return json({ error: "No logo" }, 404);
  const data = await readFile(logoPath(j.id, l.ext)).catch(() => null);
  return data ? new Response(new Uint8Array(data), { headers: { "content-type": MIME[l.ext], "cache-control": "private, max-age=60" } }) : json({ error: "No logo" }, 404);
}

/** Upload a logo (PNG, JPEG or WebP, up to 2 MB, the image itself as the body); it goes top right at first. */
export async function POST(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  const ext = TYPES[(req.headers.get("content-type") ?? "").split(";")[0] as keyof typeof TYPES];
  if (!ext) return json({ error: "Use a PNG, JPEG or WebP image." }, 400);
  const data = new Uint8Array(await req.arrayBuffer());
  if (!data.length || data.length > MAX) return json({ error: "The image must be 2 MB or smaller." }, 400);
  const old = j.captionCustom?.logo;
  if (old && old.ext !== ext) await unlink(logoPath(j.id, old.ext)).catch(() => {});
  const file = logoPath(j.id, ext);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
  const logo = { ext, x: old?.x ?? 0.86, y: old?.y ?? 0.08, size: old?.size ?? 0.2, opacity: old?.opacity ?? 1 };
  const captionCustom = sanitizeCustom({ ...j.captionCustom, logo });
  await db.update(jobs).set({ captionCustom }).where(eq(jobs.id, j.id));
  return json({ ok: true, logo: captionCustom.logo });
}

/** Remove the logo. */
export async function DELETE(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  const l = j.captionCustom?.logo;
  if (l) await unlink(logoPath(j.id, l.ext)).catch(() => {});
  const captionCustom = { ...j.captionCustom };
  delete captionCustom.logo;
  await db.update(jobs).set({ captionCustom }).where(eq(jobs.id, j.id));
  return json({ ok: true });
}
