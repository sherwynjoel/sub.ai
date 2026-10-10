import { createReadStream } from "node:fs";

/**
 * A file (or byte range) as a web stream for a Response. Pull-based so it respects backpressure,
 * and cancel() closes the file when the client seeks or leaves (Readable.toWeb throws an uncaught
 * "Controller is already closed" on client aborts).
 */
export function fileStream(path: string, start?: number, end?: number) {
  const file = createReadStream(path, { start, end });
  const chunks = file[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(c) {
      const { value, done } = await chunks.next();
      if (done) c.close();
      else c.enqueue(new Uint8Array(value));
    },
    cancel() { file.destroy(); },
  });
}
