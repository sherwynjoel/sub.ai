import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeCustom, MIN_FIT, ownLook, resolveStyle, sanitizeCustom, tamilRuns } from "./captionStyles";
import { minSec, passExpired, secondsLeft } from "./plans";

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

test("minutes and seconds read plainly", () => {
  assert.equal(minSec(0), "0 s");
  assert.equal(minSec(45), "45 s");
  assert.equal(minSec(60), "1 min");
  assert.equal(minSec(725), "12 min 5 s");
  assert.equal(minSec(89.2), "1 min 30 s"); // a part second counts as a whole one, as charged
});

test("a pass's unused minutes expire when it ends", () => {
  const now = new Date("2026-12-20T00:00:00Z"), day = 864e5;
  const paid = { plan: "creator", secondsUsed: 60, periodEnd: new Date(now.getTime() + day), createdAt: new Date("2026-01-01") };
  assert.equal(secondsLeft(paid, now), 300 * 60 - 60);
  const lapsed = { ...paid, periodEnd: new Date(now.getTime() - day) };
  assert.equal(secondsLeft(lapsed, now), 0); // not the trial's 15 minutes either
  assert.ok(passExpired(lapsed, now));
  const fresh = { plan: "free", secondsUsed: 100, periodEnd: null, createdAt: new Date(now.getTime() - 5 * day) };
  assert.equal(secondsLeft(fresh, now), 15 * 60 - 100);
  const oldTrial = { ...fresh, createdAt: new Date(now.getTime() - 31 * day) };
  assert.equal(secondsLeft(oldTrial, now), 0);
  // accounts made before passes expired get their 30 days from then
  const before = { ...fresh, createdAt: new Date("2025-06-01") };
  assert.equal(secondsLeft(before, new Date("2026-11-20T00:00:00Z")), 15 * 60 - 100);
  assert.equal(secondsLeft(before, new Date("2026-12-10T00:00:00Z")), 0);
});
