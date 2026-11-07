/** The sound's shape for the editor's timeline, kept small: one byte per LEVEL_STEP seconds, as base64 (about 100 KB an hour). */
export const LEVEL_STEP = 0.05;
const RANGE = 45; // dB below the loudest moment that still shows

/** Loudness in dB (one value per `frame` seconds) packed: each step's loudest frame, scaled to the file's own peak. */
export function packLevels(db: ArrayLike<number>, frame: number) {
  const per = Math.max(1, Math.round(LEVEL_STEP / frame)), bytes = new Uint8Array(Math.ceil(db.length / per));
  let top = -Infinity;
  for (let i = 0; i < db.length; i++) if (db[i] > top) top = db[i];
  for (let k = 0; k < bytes.length; k++) {
    let m = -Infinity;
    for (let i = k * per; i < Math.min(db.length, (k + 1) * per); i++) if (db[i] > m) m = db[i];
    bytes[k] = Math.round(Math.max(0, Math.min(1, 1 - (top - m) / RANGE)) * 255);
  }
  return Buffer.from(bytes).toString("base64");
}

/** Back to one byte per step, in the browser. */
export function unpackLevels(text: string) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}
