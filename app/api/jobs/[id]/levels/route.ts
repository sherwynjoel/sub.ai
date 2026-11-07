import { eq } from "drizzle-orm";
import { db, jobs } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { ownJob } from "@/lib/jobs";
import { LEVEL_FRAME, loudness } from "@/lib/media";
import { packLevels } from "@/lib/waveform";

type Ctx = { params: Promise<{ id: string }> };
const measuring = new Map<string, Promise<string | null>>(); // one measurement per project, however many tabs ask

/** The sound's shape for the timeline: measured once while the sound is kept, then stored for good. */
export async function GET(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const j = await ownJob((await params).id, u);
  if (!j) return json({ error: "Not found" }, 404);
  if (j.levels) return json({ levels: j.levels });
  const sound = j.audioPath ?? j.filePath;
  if (!sound) return json({ levels: null });
  let job = measuring.get(j.id);
  if (!job) {
    job = (async () => {
      const level = await loudness(sound);
      if (!level) return null;
      const levels = packLevels(level, LEVEL_FRAME);
      await db.update(jobs).set({ levels }).where(eq(jobs.id, j.id));
      return levels;
    })().finally(() => measuring.delete(j.id));
    measuring.set(j.id, job);
  }
  return json({ levels: await job });
}
