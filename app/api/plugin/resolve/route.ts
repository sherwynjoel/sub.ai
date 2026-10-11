import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LANGUAGES } from "@/lib/languages";

/** The DaVinci Resolve script, with this server's address and the language list filled in. */
export async function GET(req: Request) {
  const src = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), "plugin", "resolve", "Vasanam.lua"), "utf8");
  const langs = `{ ${LANGUAGES.map((l) => `{ "${l.code}", "${l.name}" }`).join(", ")} }`;
  const body = src.replace("__VASANAM_SERVER__", new URL(req.url).origin).replace("__VASANAM_LANGUAGES__", langs);
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": 'attachment; filename="Vasanam.lua"' } });
}
