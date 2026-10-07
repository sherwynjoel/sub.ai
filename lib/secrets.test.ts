import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("secrets round-trip and reject tampering", async () => {
  process.env.STORAGE_DIR = mkdtempSync(join(tmpdir(), "vs-"));
  const { encrypt, decrypt } = await import("./secrets");
  const blob = encrypt("sk-live-தமிழ்-123");
  assert.notEqual(blob, encrypt("sk-live-தமிழ்-123")); // random IV
  assert.equal(decrypt(blob), "sk-live-தமிழ்-123");
  const [iv, tag, body] = blob.split(".");
  const flipped = Buffer.from(body, "base64");
  flipped[0] ^= 1;
  assert.throws(() => decrypt([iv, tag, flipped.toString("base64")].join(".")));
});
