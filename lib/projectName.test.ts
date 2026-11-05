import assert from "node:assert/strict";
import { test } from "node:test";
import { attachment, renamed, stem } from "./projectName";

test("the name people see has no extension", () => {
  assert.equal(stem("Wedding reel.MOV"), "Wedding reel");
  assert.equal(stem("Ep. 2 final.mp4"), "Ep. 2 final");
  assert.equal(stem("no extension"), "no extension");
});

test("a rename keeps the original extension", () => {
  assert.equal(renamed("IMG_0042.MOV", "Wedding"), "Wedding.MOV");
  assert.equal(renamed("clip.mp4", "Ep. 2"), "Ep. 2.mp4");
  assert.equal(renamed("clip.mp4", "திருமணம்"), "திருமணம்.mp4");
  assert.equal(renamed("clip", "Wedding"), "Wedding");
});

test("typing the extension doesn't double it", () => {
  assert.equal(renamed("clip.mp4", "Wedding.mp4"), "Wedding.mp4");
  assert.equal(renamed("clip.mp4", "Wedding.MP4"), "Wedding.mp4");
});

test("names are cleaned and limited", () => {
  assert.equal(renamed("clip.mp4", "  a\nb\t "), "a b.mp4");
  assert.equal(renamed("clip.mp4", "x".repeat(300)), "x".repeat(120) + ".mp4");
});

test("nothing usable is refused", () => {
  for (const typed of ["", "   ", ".mp4", 5, null, undefined]) assert.equal(renamed("clip.mp4", typed), null);
});

test("a download keeps a Tamil name, with a plain one to fall back on", () => {
  assert.equal(attachment("திருமணம்.srt", "video.srt"), `attachment; filename="video.srt"; filename*=UTF-8''${encodeURIComponent("திருமணம்.srt")}`);
  assert.ok(attachment('a"b/c\n.srt', "x.srt").endsWith("filename*=UTF-8''a_b_c_.srt"));
  assert.ok(attachment("it's (1).srt", "x.srt").endsWith("it%27s%20%281%29.srt"));
});
