/**
 * A project's video stays on the user's device, in its original quality: only the sound goes to the server
 * (api/upload?audio=1). The editor plays this file and exports from it. It lasts as long as the page; after that the
 * user picks the same file again.
 */
export type LocalVideo = { url: string; file: File };

const videos = new Map<string, LocalVideo>();
const subs = new Set<() => void>();
let version = 0;

export const subscribeVideos = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const videosVersion = () => version;
export const localVideo = (jobId: string): LocalVideo | undefined => videos.get(jobId);

export function keepVideo(jobId: string, file: File) {
  const old = videos.get(jobId);
  if (old) URL.revokeObjectURL(old.url);
  videos.set(jobId, { file, url: URL.createObjectURL(file) });
  version++;
  subs.forEach((f) => f());
}
