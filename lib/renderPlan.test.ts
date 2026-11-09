import assert from "node:assert/strict";
import test from "node:test";
import { exportPlan, readVideo } from "./renderPlan";

const iphone = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/in/video':
  Stream #0:0[0x1]: Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(tv, bt2020nc/bt2020/arib-std-b67, progressive), 1920x1080, 11157 kb/s, 30 fps (default)
      displaymatrix: rotation of -90.00 degrees
  Stream #0:1[0x2]: Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 69 kb/s (default)`;

test("an HDR phone clip: turned upright, ten-bit, its colours named", () => {
  assert.deepEqual(readVideo(iphone), { size: { width: 1080, height: 1920 }, aac: true, deep: true, colour: { space: "bt2020nc", primaries: "bt2020", trc: "arib-std-b67" } });
});

test("an ordinary clip, and sound alone", () => {
  assert.deepEqual(readVideo("  Stream #0:0: Video: h264 (High), yuv420p(tv, bt709, progressive), 1280x720 [SAR 1:1 DAR 16:9], 30 fps\n  Stream #0:1: Audio: mp3, 44100 Hz"),
    { size: { width: 1280, height: 720 }, aac: false, deep: false, colour: { space: "bt709", primaries: "bt709", trc: "bt709" } });
  assert.deepEqual(readVideo("  Stream #0:0: Audio: aac (LC), 44100 Hz"), { size: null, aac: false, deep: false, colour: null });
});

const job = { cues: [{ start: 0, end: 1, ta: "a", en: "b" }], captionStyle: "minimal", captionCustom: {}, renderLang: "both" } as never;
const size = { width: 1080, height: 1920 };

test("the MP4 keeps the video's quality: size, depth and colours", () => {
  const sdr = exportPlan(job, { size, aac: true, logo: false, deep: false, colour: { space: "bt709", primaries: "bt709", trc: "bt709" } }).args;
  assert.equal(sdr[sdr.indexOf("-crf") + 1], "16");
  assert.equal(sdr[sdr.indexOf("-c:a") + 1], "copy");
  assert.equal(sdr[sdr.indexOf("-color_trc") + 1], "bt709");
  assert.ok(!sdr.some((a) => /scale=/.test(a)));
  const hdr = exportPlan(job, { size, aac: false, logo: false, deep: true, colour: { space: "bt2020nc", primaries: "bt2020", trc: "arib-std-b67" } }).args;
  assert.equal(hdr[hdr.indexOf("-c:v") + 1], "libx265");
  assert.equal(hdr[hdr.indexOf("-pix_fmt") + 1], "yuv420p10le");
  assert.equal(hdr[hdr.indexOf("-b:a") + 1], "320k");
});

test("the MP4 at a picked size and quality: scaled down after the captions are drawn, never up", () => {
  const p = exportPlan(job, { size, aac: false, logo: false, deep: false, colour: null, quality: { height: 720, level: "high" } }).args;
  const graph = p[p.indexOf("-filter_complex") + 1];
  assert.match(graph, /\[full\]scale=720:1280:flags=lanczos,setsar=1\[out\]$/);
  assert.ok(graph.indexOf("ass=") < graph.indexOf("scale=720"));
  assert.equal(p[p.indexOf("-crf") + 1], "20");
  const small = exportPlan(job, { size, aac: false, logo: false, deep: true, colour: null, quality: { height: null, level: "small" } }).args;
  assert.equal(small[small.indexOf("-crf") + 1], "27");
  assert.equal(small[small.indexOf("-b:a") + 1], "160k");
  const up = exportPlan(job, { size, aac: true, logo: false, deep: false, colour: null, quality: { height: 2160, level: "best" } }).args;
  assert.ok(!up.some((a) => /scale=\d+:\d+:flags/.test(a)));
  assert.equal(up[up.indexOf("-crf") + 1], "16");
});
