import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { zipEntry, zxpVersion } from "./zxp";

/** A minimal zip with the given files (deflated), built by hand for the test. */
function zip(files: Record<string, string>) {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text)), n = Buffer.from(name);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(data.length, 20); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, n, data); centrals.push(central, n);
    offset += 30 + n.length + data.length;
  }
  const dir = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

test("zxpVersion reads the panel version from the package's manifest", () => {
  const z = zip({ mimetype: "application/vnd.adobe.air-ucf-package+zip", "CSXS/manifest.xml": '<ExtensionManifest ExtensionBundleVersion="1.0.20" Version="7.0">' });
  assert.equal(zxpVersion(z), "1.0.20");
  assert.equal(zipEntry(z, "mimetype")?.toString(), "application/vnd.adobe.air-ucf-package+zip");
  assert.equal(zipEntry(z, "missing.txt"), null);
  assert.equal(zxpVersion(Buffer.from("not a zip")), null);
});
