import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { zxpVersion } from "@/lib/zxp";

/** The built Adobe panel (plugin/build.ps1 writes it here). */
export const PANEL_FILE = join(/*turbopackIgnore: true*/ process.cwd(), "public", "downloads", "vasanam-panel.zxp");

let cached: { mtime: number; version: string | null } | null = null;

/** Version of the panel currently on the server, read from the package and re-read when the file changes. */
export async function panelVersion() {
  const info = await stat(PANEL_FILE).catch(() => null);
  if (!info) return null;
  if (cached?.mtime !== info.mtimeMs) cached = { mtime: info.mtimeMs, version: zxpVersion(await readFile(PANEL_FILE)) };
  return cached.version;
}
