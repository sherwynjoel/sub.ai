import { endSession, json } from "@/lib/auth";

export async function POST() {
  await endSession();
  return json({ ok: true });
}
