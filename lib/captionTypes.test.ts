import { test } from "node:test";
import assert from "node:assert/strict";
import { CAPTION_TYPES, typeLabel, typeOf, typeSettings } from "./captionTypes";

test("caption types map to job settings and back", () => {
  for (const t of CAPTION_TYPES) for (const withEnglish of [true, false]) {
    const s = typeSettings(t.id, withEnglish);
    const back = typeOf({ script: s.script, captionCustom: { show: s.show } });
    assert.equal(back.type, t.id);
    if (t.id !== "english") assert.equal(back.withEnglish, withEnglish);
  }
  assert.deepEqual(typeSettings("spoken", true), { script: "mixed", show: "both", english: true }, "the default is unchanged");
  assert.deepEqual(typeSettings("translated", false), { script: "translated", show: "ta", english: false });
  assert.equal(typeOf({ script: "mixed" }).type, "spoken", "older projects without a show setting");
});

test("labels", () => {
  assert.equal(typeLabel({ script: "roman", captionCustom: { show: "both" } }, "Tamil"), "Tanglish + English");
  assert.equal(typeLabel({ script: "roman", captionCustom: { show: "ta" } }, "Hindi"), "Hindi in English letters");
  assert.equal(typeLabel({ script: "mixed", captionCustom: { show: "en" } }, "Tamil"), "English");
  assert.equal(typeLabel({ script: "translated", captionCustom: { show: "ta" } }, "Tamil"), "Translate to Tamil");
});
