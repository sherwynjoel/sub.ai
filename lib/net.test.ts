import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "./net";

const req = (h: Record<string, string>) => new Request("http://x/", { headers: h });

test("clientIp takes the address the proxy added, not one the client sent", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" })), "203.0.113.9", "a faked first hop is ignored");
  assert.equal(clientIp(req({ "x-forwarded-for": "203.0.113.9" })), "203.0.113.9");
  assert.equal(clientIp(req({ "x-real-ip": "198.51.100.7" })), "198.51.100.7");
  assert.equal(clientIp(req({})), "local");
});
