import { test } from "node:test";
import assert from "node:assert/strict";
import { geminiUsage, Meter } from "./ai/usage";

async function prices() {
  // server-only throws outside Next; stub it for the test.
  const Module = await import("node:module");
  const req = Module.createRequire(import.meta.url);
  req.cache[req.resolve("server-only")] = { exports: {} } as never;
  return import("./aiPrices");
}

test("Gemini usage: audio tokens apart from text, thinking counted as output", () => {
  const u = geminiUsage({ promptTokenCount: 2000, candidatesTokenCount: 300, thoughtsTokenCount: 200, promptTokensDetails: [{ modality: "AUDIO", tokenCount: 1920 }, { modality: "TEXT", tokenCount: 80 }] }, "gemini-2.5-flash");
  assert.deepEqual(u, { provider: "gemini", model: "gemini-2.5-flash", kind: "subtitles", audioTok: 1920, inTok: 80, outTok: 500 });
  assert.deepEqual(geminiUsage(undefined, "m"), { provider: "gemini", model: "m", kind: "subtitles", audioTok: 0, inTok: 0, outTok: 0 });
});

test("cost in ₹: per token in dollars, per hour and per character in rupees", async () => {
  const { costInr, DEFAULT_PRICES } = await prices();
  const book = { usdInr: 88, prices: DEFAULT_PRICES };
  // 1 min of Gemini audio ≈ 1920 tokens at $1/M, 100 text tokens at $0.30/M, 1000 out at $2.50/M
  const g = costInr(book, { model: "gemini-2.5-flash", audioTok: 1920, inTok: 100, outTok: 1000 })!;
  assert.ok(Math.abs(g - (1920 * 1 + 100 * 0.3 + 1000 * 2.5) / 1e6 * 88) < 1e-9);
  // a dated name uses its base model's price
  assert.equal(costInr(book, { model: "gemini-2.5-flash-preview-05-20", outTok: 1e6 }), 2.5 * 88);
  // Sarvam: ₹30 an hour of audio, ₹20 per 10k characters
  assert.equal(costInr(book, { model: "saaras:v4", audioSec: 3600 }), 30);
  assert.equal(costInr(book, { model: "mayura:v1", chars: 5000 }), 10);
  assert.equal(costInr(book, { model: "unknown-model", audioSec: 60 }), null);
});

test("meter keeps every call", () => {
  const m = new Meter();
  m.add({ provider: "sarvam", model: "saaras:v4", kind: "subtitles", audioSec: 30 });
  m.add({ provider: "sarvam", model: "saaras:v4", kind: "subtitles", audioSec: 30 });
  assert.equal(m.rows.length, 2);
});
