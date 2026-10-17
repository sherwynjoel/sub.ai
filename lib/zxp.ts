import { inflateRawSync } from "node:zlib";

/** One file out of a zip (a .zxp is a zip), or null. Stored and deflated entries; no zip64. */
export function zipEntry(zip: Buffer, name: string): Buffer | null {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); // end of central directory
  if (end < 0) return null;
  for (let i = 0, n = zip.readUInt16LE(end + 10), p = zip.readUInt32LE(end + 16); i < n; i++) {
    const nameLen = zip.readUInt16LE(p + 28);
    if (zip.toString("utf8", p + 46, p + 46 + nameLen) === name) {
      const at = zip.readUInt32LE(p + 42), start = at + 30 + zip.readUInt16LE(at + 26) + zip.readUInt16LE(at + 28);
      const data = zip.subarray(start, start + zip.readUInt32LE(p + 20));
      return zip.readUInt16LE(p + 10) === 8 ? inflateRawSync(data) : Buffer.from(data);
    }
    p += 46 + nameLen + zip.readUInt16LE(p + 30) + zip.readUInt16LE(p + 32);
  }
  return null;
}

/** The panel version inside a .zxp (CSXS/manifest.xml ExtensionBundleVersion), or null. */
export function zxpVersion(zip: Buffer): string | null {
  const manifest = zipEntry(zip, "CSXS/manifest.xml")?.toString("utf8") ?? "";
  return manifest.match(/ExtensionBundleVersion="([\w.-]+)"/)?.[1] ?? null;
}
