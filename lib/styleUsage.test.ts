import assert from "node:assert/strict";
import { test } from "node:test";
import { CAPTION_STYLES, DEFAULT_STYLE, POPULAR, STYLE_CHOICES } from "./captionStyles";
import { styleTable, type StyleCount } from "./styleUsage";

const count = (style: string, projects: number, videos = 0): StyleCount => ({ style, projects, people: 1, videos, last: null });
const [a, b, c] = STYLE_CHOICES.filter((s) => s.id !== DEFAULT_STYLE && !POPULAR.includes(s.id));

test("most used first, ties by exported videos", () => {
  const t = styleTable([count(a.id, 1), count(b.id, 5), count(c.id, 1, 2)]);
  assert.deepEqual(t.used.map((u) => u.style), [b.id, c.id, a.id]);
  assert.equal(t.total, 7);
  assert.equal(t.used[0].share, 5 / 7);
});

test("every style on offer is either used or unused, never both", () => {
  const t = styleTable([count(a.id, 2)]);
  assert.equal(t.unused.length, STYLE_CHOICES.length - 1);
  assert.ok(!t.unused.some((s) => s.id === a.id));
});

test("nothing used yet", () => {
  const t = styleTable([]);
  assert.equal(t.total, 0);
  assert.equal(t.unused.length, STYLE_CHOICES.length);
});

test("tags explain a count that placement may have helped", () => {
  const t = styleTable([count(DEFAULT_STYLE, 1), count(POPULAR.find((id) => id !== DEFAULT_STYLE)!, 1)]);
  assert.ok(t.used.find((u) => u.style === DEFAULT_STYLE)!.tags.includes("Default"));
  assert.ok(t.used.some((u) => u.tags.includes("Shown first")));
});

test("a retired or unknown style still shows", () => {
  const retired = CAPTION_STYLES.find((s) => !STYLE_CHOICES.includes(s));
  if (retired) assert.deepEqual(styleTable([count(retired.id, 1)]).used[0].tags, ["No longer offered"]);
  const t = styleTable([count("gone-style", 3)]);
  assert.equal(t.used[0].name, "gone-style");
  assert.deepEqual(t.used[0].tags, ["No longer offered"]);
});
