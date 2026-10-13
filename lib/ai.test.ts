import { test } from "node:test";
import assert from "node:assert/strict";
import { subtitleRules } from "./ai/shared";
import { passesFor } from "./ai/sarvam";

test("subtitleRules tells the model which script to write the main line in", () => {
  assert.match(subtitleRules("Tamil", "mixed"), /native script[\s\S]*English loanwords may stay in English/);
  assert.match(subtitleRules("Tamil", "roman"), /Roman letters/);
  assert.match(subtitleRules("Tamil", "native"), /only Tamil script/);
  assert.doesNotMatch(subtitleRules("Tamil", "native"), /Roman letters/);
});

test("passesFor runs one Saaras pass per line the user asked for", () => {
  assert.deepEqual(passesFor("mixed", true), ["codemix", "translate"]);
  assert.deepEqual(passesFor("roman", false), ["translit"]);
  assert.deepEqual(passesFor("native", true), ["transcribe", "translate"]);
});
