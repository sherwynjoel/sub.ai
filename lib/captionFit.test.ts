import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeCustom, MIN_FIT, ownLook, resolveStyle, sanitizeCustom, tamilRuns } from "./captionStyles";

test("a fit shrinks the caption in proportion", () => {
  const full = resolveStyle("minimal", {}), fitted = resolveStyle("minimal", { fit: 0.5 });
  assert.ok(Math.abs(fitted.size! / full.size! - 0.5) < 0.01);
  assert.equal(fitted.scale, 0.5);
});

test("a size the user chose wins over a fit", () => {
  assert.equal(resolveStyle("minimal", mergeCustom({ size: 1.4 }, { fit: 0.5 })).scale, 1.4);
});

test("a fit survives saving, within bounds, and isn't kept when it does nothing", () => {
  assert.equal(ownLook({ fit: 0.7 }).fit, 0.7);
  assert.equal(sanitizeCustom({ fit: 0.01 }).fit, MIN_FIT);
  assert.equal(sanitizeCustom({ fit: 1 }).fit, undefined);
  assert.equal(sanitizeCustom({ fit: "big" }).fit, undefined);
});

test("letter spacing set inside a caption never pulls Tamil letters apart", () => {
  const out = tamilRuns("{\\fsp6}abc கண்டிப்பாக def", { Main: "Inter" }, "Main");
  assert.match(out, /\\fsp0\}கண்டிப்பாக/);
  assert.match(out, /\\fsp6\}def/);
});
