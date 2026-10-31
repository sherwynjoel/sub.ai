import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToHsv, hsvToHex, parseColor } from "../components/ColorPicker";

test("colour codes typed in any common form, and the wheel's colour maths round-trip", () => {
  assert.equal(parseColor("#7f011f"), "#7F011F");
  assert.equal(parseColor("7F011F"), "#7F011F");
  assert.equal(parseColor(" f00 "), "#FF0000");
  assert.equal(parseColor("rgb(127, 1, 31)"), "#7F011F");
  assert.equal(parseColor("rgb(300, 1, 1)"), null);
  assert.equal(parseColor("wine"), null);
  for (const c of ["#7F011F", "#F5EBD0", "#FFFFFF", "#000000", "#0A84FF", "#FFD60A"]) assert.equal(hsvToHex(...hexToHsv(c)), c);
  assert.equal(hsvToHex(0, 1, 1), "#FF0000");
  assert.equal(hsvToHex(120, 1, 1), "#00FF00");
});
