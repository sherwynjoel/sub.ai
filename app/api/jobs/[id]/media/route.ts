import { stat } from "node:fs/promises";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { fileStream } from "@/lib/stream";

/**
 * Streams the video with Range support so the player can seek: `?preview=1` the light copy made for playback
 * (lib/media.ts makePreview) when there is one, otherwise the upload. The browser may keep what it fetched (the
 * copy and the upload have different URLs, and neither changes once written).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j?.filePath) return json({ error: "Video no longer stored" }, 404);
  const preview = new URL(req.url).searchParams.has("preview") && j.previewPath ? j.previewPath : null;
  const file = preview ?? j.filePath;
  const { size } = await stat(file);
  const m = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  const start = m?.[1] ? +m[1] : 0;
  const end = m?.[2] ? Math.min(+m[2], size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  const body = fileStream(file, start, end);
  return new Response(body, {
    status: m ? 206 : 200,
    headers: {
      "content-type": preview ? "video/mp4" : j.mime, "accept-ranges": "bytes", "content-length": String(end - start + 1),
      "cache-control": "private, max-age=86400",
      ...(m ? { "content-range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}
