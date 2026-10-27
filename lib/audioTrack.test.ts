import { test } from "node:test";
import assert from "node:assert/strict";
import { openAsBlob } from "node:fs";
import { extractAudio } from "./audioTrack";

// Two seconds of tone and black: an MP4 with its index first, and a MOV with it at the end (as phones save them).
for (const name of ["tone.mp4", "tone.mov"]) test(`the sound of ${name}, without re-encoding: every AAC frame, ADTS-framed, as long as the track`, async () => {
  const file = await openAsBlob(`lib/fixtures/${name}`);
  const a = await extractAudio(file);
  assert.ok(a, "found the AAC track");
  const buf = new Uint8Array(await a.adts.arrayBuffer());
  assert.ok(buf.length < file.size, "only the sound (the fixture is nearly all sound; a real 4K minute is ~1 MB of 400)");
  let p = 0, frames = 0;
  while (p + 7 <= buf.length) {
    assert.equal(buf[p], 0xff); assert.equal(buf[p + 1] & 0xf0, 0xf0); // ADTS sync on every frame
    p += ((buf[p + 3] & 3) << 11) | (buf[p + 4] << 3) | (buf[p + 5] >> 5);
    frames++;
  }
  assert.equal(p, buf.length);
  assert.equal(frames, a.frames);
  const rate = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350][(buf[2] >> 2) & 15];
  assert.ok(Math.abs((frames * 1024) / rate - a.seconds) < 0.1, "frames add up to the track's length");
  assert.ok(Math.abs(a.seconds - 2) < 0.1, "two seconds");
});

test("not an MP4: null (the whole file is sent instead)", async () => {
  assert.equal(await extractAudio(new Blob([new Uint8Array(4096).fill(7)])), null);
  assert.equal(await extractAudio(new Blob(["just some text, not a video"])), null);
});
