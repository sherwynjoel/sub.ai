import assert from "node:assert/strict";
import { test } from "node:test";
import { googleIdentity } from "./google";

const token = (claims: object) => `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`;
const good = { iss: "https://accounts.google.com", aud: "id", exp: 2000, email: "A@Gmail.com", email_verified: true, name: "Asha" };

test("reads a good token", () => {
  assert.deepEqual(googleIdentity(token(good), "id", 1000e3), { email: "a@gmail.com", name: "Asha" });
});
test("falls back to the email's name", () => {
  assert.equal(googleIdentity(token({ ...good, name: "" }), "id", 1000e3)?.name, "a");
});
test("refuses another app, an expired token, an unconfirmed email and junk", () => {
  assert.equal(googleIdentity(token({ ...good, aud: "other" }), "id", 1000e3), null);
  assert.equal(googleIdentity(token({ ...good, iss: "https://evil.example" }), "id", 1000e3), null);
  assert.equal(googleIdentity(token(good), "id", 3000e3), null);
  assert.equal(googleIdentity(token({ ...good, email_verified: false }), "id", 1000e3), null);
  assert.equal(googleIdentity("junk", "id"), null);
});
