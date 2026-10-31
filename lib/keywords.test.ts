import { test } from "node:test";
import assert from "node:assert/strict";
import { pickKeywords } from "./keywords";

const pick = (t: string) => pickKeywords(t.split(" ")).map((i) => t.split(" ")[i]);

test("keywords: numbers and money first, then names and strong words; never filler", () => {
  assert.deepEqual(pick("website? 70% of customers check online before"), ["70%"]);
  assert.deepEqual(pick("this is how we make great videos for every business owner today"), ["videos", "business"]);
  assert.deepEqual(pick("we tried EveryCut on our videos"), ["EveryCut"]);
  assert.deepEqual(pick("save ₹500 every month"), ["₹500"]);
  assert.deepEqual(pick("so na enna da"), []);
  assert.deepEqual(pick("the and of"), []);
});
