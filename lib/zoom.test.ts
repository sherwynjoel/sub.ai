import { test } from "node:test";
import assert from "node:assert/strict";
import { zoomAt, zoomExpr, zoomMoments, zoomOf } from "./zoom";

test("auto zoom: on each caption's key word (a picked-out word first), spaced, the preview and the MP4 the same curve", () => {
  const cues = [
    { start: 0, end: 2, ta: "website? 70% of customers", en: "", w: [0, 0.5, 1, 1.4] },
    { start: 2, end: 3, ta: "check online", en: "" }, // too soon after the last zoom
    { start: 5, end: 7, ta: "buy now from us", en: "", w: [5, 5.5, 6, 6.5], wc: [null, null, null, "#ff0000"] }, // picked "us"
  ];
  const m = zoomMoments(cues, "ta");
  assert.deepEqual(m, [{ s: 0.5, e: 1.4 }, { s: 6.5, e: 7 }]);
  const z = zoomOf({ strength: 1.2, style: "punch" })!;
  assert.equal(zoomAt(0.2, m, z), 1);
  assert.ok(Math.abs(zoomAt(1, m, z) - 1.2) < 1e-9);
  // the ffmpeg expression gives the same number
  const expr = zoomExpr(m, z).replace(/between\(t,([\d.]+),([\d.]+)\)/g, "(t>=$1&&t<=$2?1:0)").replace(/\bmin\(/g, "Math.min(");
  for (const t of [0.2, 0.52, 1, 1.39, 6.6]) assert.ok(Math.abs(new Function("t", `return ${expr}`)(t) - zoomAt(t, m, z)) < 1e-3, `t=${t}`);
  assert.equal(zoomOf({ strength: 9 })!.strength, 1.4);
  assert.equal(zoomOf(null), undefined);
});
