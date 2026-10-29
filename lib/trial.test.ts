import { test } from "node:test";
import assert from "node:assert/strict";
import { emailKey, throwawayEmail } from "./trial";

test("emails reaching the same inbox share a key", () => {
  assert.equal(emailKey("Ravi.Kumar+free2@Gmail.com"), "ravikumar@gmail.com");
  assert.equal(emailKey("r.a.v.i.kumar@googlemail.com"), "ravikumar@gmail.com");
  assert.equal(emailKey("ravi+x@outlook.com"), "ravi@outlook.com");
  assert.equal(emailKey("ravi.kumar@outlook.com"), "ravi.kumar@outlook.com"); // dots matter outside Gmail
});

test("throwaway inboxes are spotted, sub-domains too", () => {
  assert.equal(throwawayEmail("a@mailinator.com"), true);
  assert.equal(throwawayEmail("a@x.yopmail.com"), true);
  assert.equal(throwawayEmail("a@gmail.com"), false);
  assert.equal(throwawayEmail("a@mymailinator.com"), false);
});
