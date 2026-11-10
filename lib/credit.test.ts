import { test } from "node:test";
import assert from "node:assert/strict";
import { isOutOfCredit } from "./health";

test("spots an AI service out of credit", () => {
  assert.equal(isOutOfCredit(new Error("AI service error 402: Payment Required")), true);
  assert.equal(isOutOfCredit(new Error("AI service error 403: Insufficient credits in your account")), true);
  assert.equal(isOutOfCredit(new Error("AI service error 429: You have exhausted your credits")), true);
  assert.equal(isOutOfCredit(new Error("AI service error 400: Not enough balance")), true);
  assert.equal(isOutOfCredit(new Error("AI service error 500: internal error")), false);
  assert.equal(isOutOfCredit(new Error("AI service error 4020: odd")), false);
  assert.equal(isOutOfCredit(new Error("This file has 3 min of sound, and there aren't enough minutes left")), false);
});
