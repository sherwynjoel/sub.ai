/**
 * The sound of an MP4 / MOV (what phones record), pulled out in the browser without re-encoding: the file's index
 * (moov) says where each AAC frame lies, only those bytes are read, and each frame gets a 7-byte ADTS header. A
 * minute of 4K video (~400 MB) gives ~1 MB of audio, uploaded first so captioning starts while the video follows.
 *
 * Null when the file isn't MP4/MOV, has no AAC track, or anything looks unusual: the caller then uploads the whole
 * video the old way.
 */

type Read = (pos: number, len: number) => Promise<DataView>;
type Box = { type: string; start: number; size: number; head: number }; // start of the box, its size, header length

const MAX_MOOV = 96 * 1024 * 1024; // a sane index; bigger means something odd
const FOURCC = (v: DataView, at: number) => String.fromCharCode(v.getUint8(at), v.getUint8(at + 1), v.getUint8(at + 2), v.getUint8(at + 3));

/** Boxes inside v[from, to). */
function boxes(v: DataView, from: number, to: number): Box[] {
  const out: Box[] = [];
  for (let p = from; p + 8 <= to; ) {
    let size = v.getUint32(p), head = 8;
    const type = FOURCC(v, p + 4);
    if (size === 1) { size = Number(v.getBigUint64(p + 8)); head = 16; }
    else if (size === 0) size = to - p;
    if (size < head || p + size > to) break;
    out.push({ type, start: p, size, head });
    p += size;
  }
  return out;
}
const child = (v: DataView, b: Box | undefined, type: string) => (b ? boxes(v, b.start + b.head, b.start + b.size).find((x) => x.type === type) : undefined);
const path = (v: DataView, b: Box | undefined, ...types: string[]) => types.reduce<Box | undefined>((acc, t) => child(v, acc, t), b);

/** Find moov at the top level (phones often put it at the end, after the video data, which is skipped). */
async function findMoov(read: Read, size: number) {
  for (let p = 0; p + 8 <= size; ) {
    const h = await read(p, Math.min(16, size - p));
    let len = h.getUint32(0), head = 8;
    const type = FOURCC(h, 4);
    if (len === 1) { len = Number(h.getBigUint64(8)); head = 16; }
    else if (len === 0) len = size - p;
    if (len < head) return null;
    if (type === "moov") return len > MAX_MOOV ? null : read(p, len);
    p += len;
  }
  return null;
}

/** An MPEG-4 descriptor's length (1–4 bytes, 7 bits each). */
function descLen(v: DataView, at: number): [number, number] {
  let n = 0, i = 0;
  for (; i < 4; i++) { const b = v.getUint8(at + i); n = (n << 7) | (b & 0x7f); if (!(b & 0x80)) break; }
  return [n, i + 1];
}

/** AudioSpecificConfig bytes from an esds box, if the stream is AAC (object type 0x40). */
function ascFromEsds(v: DataView, esds: Box): Uint8Array | null {
  let p = esds.start + esds.head + 4; // version + flags
  const end = esds.start + esds.size;
  if (v.getUint8(p) !== 0x03) return null;
  let [len, n] = descLen(v, p + 1);
  p += 1 + n;
  const flags = v.getUint8(p + 2);
  p += 3;
  if (flags & 0x80) p += 2;
  if (flags & 0x40) p += 1 + v.getUint8(p);
  if (flags & 0x20) p += 2;
  if (p >= end || v.getUint8(p) !== 0x04) return null;
  [len, n] = descLen(v, p + 1);
  p += 1 + n;
  if (v.getUint8(p) !== 0x40) return null; // not MPEG-4 audio
  p += 13;
  if (p >= end || v.getUint8(p) !== 0x05) return null;
  [len, n] = descLen(v, p + 1);
  p += 1 + n;
  return len >= 2 && p + len <= end ? new Uint8Array(v.buffer, v.byteOffset + p, len) : null;
}

/** The esds of the first sample entry (inside mp4a directly, or in QuickTime's wave box): found by its name. */
function findEsds(v: DataView, stsd: Box): Box | null {
  for (let p = stsd.start + stsd.head + 8; p + 8 < stsd.start + stsd.size; p++) {
    if (v.getUint8(p + 4) === 0x65 && FOURCC(v, p + 4) === "esds") {
      const size = v.getUint32(p);
      if (size >= 12 && p + size <= stsd.start + stsd.size) return { type: "esds", start: p, size, head: 8 };
    }
  }
  return null;
}

/**
 * Where the sound starts in the video: its edit list can leave a gap before it (an empty edit) and skip the
 * start of the stream (the encoder's priming). Seconds to move the raw stream by to line up with the video:
 * positive = later. 0 for phone recordings; e.g. -0.046 for some editors' exports.
 */
function editShift(v: DataView, trak: Box, mdhdScale: number, movieScale: number) {
  const elst = path(v, trak, "edts", "elst");
  if (!elst || !movieScale || !mdhdScale) return 0;
  const p0 = elst.start + elst.head, ver = v.getUint8(p0), n = v.getUint32(p0 + 4);
  let empty = 0;
  for (let i = 0; i < n; i++) {
    const at = p0 + 8 + i * (ver ? 20 : 12);
    const dur = ver ? Number(v.getBigUint64(at)) : v.getUint32(at);
    const start = ver ? Number(v.getBigInt64(at + 8)) : v.getInt32(at + 4);
    if (start === -1) { empty += dur; continue; }
    return empty / movieScale - start / mdhdScale;
  }
  return 0;
}

export type AudioTrack = { adts: Blob; frames: number; seconds: number; shift: number };

/** The file's AAC sound as an ADTS stream, or null (see the top). */
export async function extractAudio(file: Blob): Promise<AudioTrack | null> {
  try {
    const read: Read = async (pos, len) => new DataView(await file.slice(pos, pos + len).arrayBuffer());
    const moov = await findMoov(read, file.size);
    if (!moov) return null;
    for (const trak of boxes(moov, 8, moov.byteLength).filter((b) => b.type === "trak")) {
      const mdia = child(moov, trak, "mdia");
      const hdlr = child(moov, mdia, "hdlr");
      if (!hdlr || FOURCC(moov, hdlr.start + hdlr.head + 8) !== "soun") continue;
      const stbl = path(moov, mdia, "minf", "stbl");
      const stsd = child(moov, stbl, "stsd"), stsz = child(moov, stbl, "stsz"), stsc = child(moov, stbl, "stsc");
      const stco = child(moov, stbl, "stco") ?? child(moov, stbl, "co64");
      const mdhd = child(moov, mdia, "mdhd");
      if (!stsd || !stsz || !stsc || !stco || !mdhd) continue;
      const esds = findEsds(moov, stsd);
      const asc = esds && ascFromEsds(moov, esds);
      if (!asc) continue;
      // AudioSpecificConfig: object type (5 bits), sample-rate index (4), channels (4).
      const aot = asc[0] >> 3, sfi = ((asc[0] & 7) << 1) | (asc[1] >> 7), chans = (asc[1] >> 3) & 15;
      if (![1, 2, 3, 4, 5, 29].includes(aot) || sfi > 12 || chans < 1 || chans > 7) return null;
      const profile = aot === 5 || aot === 29 ? 1 : aot - 1; // HE-AAC is LC + extensions the decoder finds itself

      // Sample sizes, chunk offsets and how many samples each chunk holds.
      const s0 = stsz.start + stsz.head;
      const fixed = moov.getUint32(s0 + 4), count = moov.getUint32(s0 + 8);
      const sizes = Array.from({ length: count }, (_, i) => (fixed || moov.getUint32(s0 + 12 + 4 * i)));
      const c0 = stco.start + stco.head, chunks = moov.getUint32(c0 + 4);
      const offsets = Array.from({ length: chunks }, (_, i) => (stco.type === "co64" ? Number(moov.getBigUint64(c0 + 8 + 8 * i)) : moov.getUint32(c0 + 8 + 4 * i)));
      const r0 = stsc.start + stsc.head, runs = moov.getUint32(r0 + 4);
      const perChunk: number[] = [];
      for (let k = 0; k < runs; k++) {
        const first = moov.getUint32(r0 + 8 + 12 * k), n = moov.getUint32(r0 + 12 + 12 * k);
        const next = k + 1 < runs ? moov.getUint32(r0 + 8 + 12 * (k + 1)) : chunks + 1;
        for (let c = first; c < next && c <= chunks; c++) perChunk[c - 1] = n;
      }
      // Read each chunk's audio bytes in one piece (16 at a time), then frame every sample.
      const parts: BlobPart[] = [];
      let sample = 0;
      const jobs = offsets.map((off, c) => {
        const n = perChunk[c] ?? 0, first = sample;
        sample += n;
        return { off, first, n, bytes: sizes.slice(first, first + n).reduce((a, b) => a + b, 0) };
      });
      if (sample !== count) return null;
      for (let i = 0; i < jobs.length; i += 16) {
        const got = await Promise.all(jobs.slice(i, i + 16).map((j) => file.slice(j.off, j.off + j.bytes).arrayBuffer()));
        got.forEach((buf, k) => {
          const j = jobs[i + k];
          if (buf.byteLength !== j.bytes) throw new Error("short read");
          for (let s = 0, at = 0; s < j.n; s++) {
            const len = sizes[j.first + s], full = len + 7;
            const h = new Uint8Array(7);
            h[0] = 0xff; h[1] = 0xf1; // sync, MPEG-4, no CRC
            h[2] = (profile << 6) | (sfi << 2) | (chans >> 2);
            h[3] = ((chans & 3) << 6) | (full >> 11);
            h[4] = (full >> 3) & 0xff;
            h[5] = ((full & 7) << 5) | 0x1f;
            h[6] = 0xfc;
            parts.push(h, new Uint8Array(buf, at, len));
            at += len;
          }
        });
      }
      const timescale = moov.getUint32(mdhd.start + mdhd.head + (moov.getUint8(mdhd.start + mdhd.head) === 1 ? 20 : 12));
      const dur = moov.getUint8(mdhd.start + mdhd.head) === 1 ? Number(moov.getBigUint64(mdhd.start + mdhd.head + 24)) : moov.getUint32(mdhd.start + mdhd.head + 16);
      const mvhd = child(moov, { type: "moov", start: 0, size: moov.byteLength, head: 8 }, "mvhd");
      const movieScale = mvhd ? moov.getUint32(mvhd.start + mvhd.head + (moov.getUint8(mvhd.start + mvhd.head) === 1 ? 20 : 12)) : 0;
      const shift = Math.max(-5, Math.min(5, editShift(moov, trak, timescale, movieScale))); // anything bigger is a strange file
      return { adts: new Blob(parts, { type: "audio/aac" }), frames: count, seconds: timescale ? dur / timescale : 0, shift };
    }
    return null;
  } catch {
    return null;
  }
}
