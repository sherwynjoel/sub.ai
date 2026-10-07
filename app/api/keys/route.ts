import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { currentUser, json, newApiKey, unauthorized } from "@/lib/auth";

/** Create / rotate the plugin API key. The full key is shown once. */
export async function POST() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const k = newApiKey();
  await db.update(users).set({ apiKeyHash: k.hash, apiKeyHint: k.hint }).where(eq(users.id, u.id));
  return json({ key: k.key, hint: k.hint });
}
