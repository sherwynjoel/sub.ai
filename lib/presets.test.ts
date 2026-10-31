import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPreset, knownStyle, presetLook, presetName } from "./presets";

test("presets keep the look, not the video's own parts; applying one keeps this video's canvas, titles and logo", () => {
  const project = { font: "Anton", color: "#ff0000", safe: "reels" as const, textAlign: "left" as const, show: "en" as const,
    canvas: { ratio: "9:16" as const, fit: "fit" as const, bg: "blur" }, layers: [{ text: "Hi", start: 0, end: 1, x: 0.5, y: 0.5 }],
    logo: { ext: "png" as const, x: 0.9, y: 0.1, size: 0.2, opacity: 1 } };
  const look = presetLook(project);
  assert.deepEqual(look, { font: "Anton", color: "#ff0000", safe: "reels", textAlign: "left" });
  assert.deepEqual(presetLook({ font: "Not a font", color: "red", junk: 1 }), {}, "only valid settings");
  const other = { size: 1.4, show: "both" as const, canvas: { ratio: "1:1" as const, fit: "fill" as const, bg: "blur" }, layers: [] };
  assert.deepEqual(applyPreset(other, look), { ...look, canvas: other.canvas, layers: [], show: "both" }, "this video keeps the lines it shows");
  assert.equal(presetName("  My   brand  "), "My brand");
  assert.equal(presetName("   "), null);
  assert.equal(presetName("x".repeat(80))?.length, 40);
  assert.ok(knownStyle("cc-cinematic") && !knownStyle("nope"));
});
