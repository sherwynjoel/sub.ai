import { stat } from "node:fs/promises";
import { json } from "@/lib/auth";
import { fileStream } from "@/lib/stream";
import { panelVersion, PANEL_FILE } from "@/lib/panel";

/** The Adobe panel download, saved as vasanam-panel-v<version>.zxp (the version comes from the package itself). */
export async function GET() {
  const info = await stat(PANEL_FILE).catch(() => null);
  if (!info) return json({ error: "The panel hasn't been built on this server yet." }, 404);
  const version = await panelVersion();
  return new Response(fileStream(PANEL_FILE), {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(info.size),
      "content-disposition": `attachment; filename="vasanam-panel${version ? `-v${version}` : ""}.zxp"`,
      "cache-control": "no-store", // a new build must not be served from a cache under the old name
    },
  });
}
