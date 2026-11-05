const EXT = /\.[a-z0-9]{1,8}$/i;

/** A project's name as people see it: its file name without the extension. */
export const stem = (filename: string) => filename.replace(EXT, "");

/**
 * The file name after a rename: what was typed, keeping the original extension (the upload reads the video's type from
 * it, and downloads are named after it). Null when nothing usable was typed.
 */
export function renamed(filename: string, typed: unknown) {
  if (typeof typed !== "string") return null;
  const ext = filename.match(EXT)?.[0] ?? "";
  // eslint-disable-next-line no-control-regex
  let name = typed.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (ext && name.toLowerCase().endsWith(ext.toLowerCase())) name = name.slice(0, -ext.length);
  name = name.slice(0, 120).trim();
  return name ? name + ext : null;
}

/** A download's header, keeping a name in any language; `fallback` is for anything that can't read the full one. */
export function attachment(name: string, fallback: string) {
  const safe = name.replace(/[\u0000-\u001f\u007f"\\/]+/g, "_"); // eslint-disable-line no-control-regex
  const coded = encodeURIComponent(safe).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${coded}`;
}
