import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

test("webhook signature check", async () => {
  // server-only throws outside Next; stub it for the test.
  const Module = await import("node:module");
  const req = Module.createRequire(import.meta.url);
  req.cache[req.resolve("server-only")] = { exports: {} } as never;
  const { hmacOk } = await import("./razorpay");
  const body = '{"event":"subscription.charged"}';
  const sig = createHmac("sha256", "s3cret").update(body).digest("hex");
  assert.equal(hmacOk(body, sig, "s3cret"), true);
  assert.equal(hmacOk(body + " ", sig, "s3cret"), false);
  assert.equal(hmacOk(body, null, "s3cret"), false);
  assert.equal(hmacOk(body, sig, ""), false);
});
