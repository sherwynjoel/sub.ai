import { stat } from "node:fs/promises";
import { join } from "node:path";
import { json } from "@/lib/auth";
import { fileStream } from "@/lib/stream";

const FILE = join(/*turbopackIgnore: true*/ process.cwd(), "public", "downloads", "vasanam-engine-source.tar");

/** The video engine's source code: the GPL asks that it's as easy to get as the engine, so no sign-in. */
export async function GET() {
  const info = await stat(FILE).catch(() => null);
  if (!info) return json({ error: "The source download isn't on this server yet." }, 404);
  return new Response(fileStream(FILE), {
    headers: {
      "content-type": "application/x-tar",
      "content-length": String(info.size),
      "content-disposition": 'attachment; filename="vasanam-engine-source.tar"',
    },
  });
}
