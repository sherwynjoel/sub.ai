import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { STYLE_CHOICES } from "./captionStyles";
import { overlayKey } from "./overlay";

const look = { cues: [{ start: 0, end: 1, ta: "வணக்கம்", en: "" }], captionStyle: "tall-caps", captionCustom: {} };

test("the panel's overlay is made again only when the look changes", () => {
  const key = overlayKey(look, "ta", false);
  assert.equal(overlayKey(structuredClone(look), "ta", false), key);
  assert.notEqual(overlayKey({ ...look, captionStyle: "cc-pro" }, "ta", false), key);
  assert.notEqual(overlayKey({ ...look, captionCustom: { size: 1.4 } }, "ta", false), key);
  assert.notEqual(overlayKey({ ...look, cues: [{ ...look.cues[0], ta: "நன்றி" }] }, "ta", false), key);
  assert.notEqual(overlayKey(look, "both", false), key);
  assert.notEqual(overlayKey(look, "ta", true), key); // the trial's mark comes off after paying
});

test("every style on offer has its picture for the panel (scripts/style-previews.mts)", () => {
  for (const s of STYLE_CHOICES) assert.ok(existsSync(join("public", "style-previews", `${s.id}.png`)), s.id);
});
