import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { currentUser, json } from "@/lib/auth";

/** The user closed the "invite minutes added" popup: don't show those again. */
export async function POST() {
  const u = await currentUser();
  if (!u) return json({ error: "Sign in first." }, 401);
  await db.update(users).set({ inviteSeenAt: new Date() }).where(eq(users.id, u.id));
  return json({ ok: true });
}
