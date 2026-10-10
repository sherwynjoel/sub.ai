import { stat } from "node:fs/promises";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { fileStream } from "@/lib/stream";

/** Streams the uploaded video with Range support so the player can seek. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j?.filePath) return json({ error: "Video no longer stored" }, 404);
  const { size } = await stat(j.filePath);
  const m = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  const start = m?.[1] ? +m[1] : 0;
  const end = m?.[2] ? Math.min(+m[2], size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  const body = fileStream(j.filePath, start, end);
  return new Response(body, {
    status: m ? 206 : 200,
    headers: {
      "content-type": j.mime, "accept-ranges": "bytes", "content-length": String(end - start + 1),
      ...(m ? { "content-range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}
