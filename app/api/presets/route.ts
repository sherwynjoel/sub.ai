import { and, asc, eq, sql } from "drizzle-orm";
import { db, stylePresets } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { knownStyle, MAX_PRESETS, presetLook, presetName } from "@/lib/presets";

const fields = { id: stylePresets.id, name: stylePresets.name, styleId: stylePresets.styleId, custom: stylePresets.custom, isDefault: stylePresets.isDefault };

/** The signed-in user's saved looks, oldest first. */
export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const presets = await db.select(fields).from(stylePresets).where(eq(stylePresets.userId, u.id)).orderBy(asc(stylePresets.createdAt));
  return json({ presets });
}

/** Save a look: { name, styleId, custom, isDefault? }. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const name = presetName(body.name);
  if (!name) return json({ error: "Give the preset a name." }, 400);
  if (!knownStyle(body.styleId)) return json({ error: "Unknown style." }, 400);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(stylePresets).where(eq(stylePresets.userId, u.id));
  if (n >= MAX_PRESETS) return json({ error: `You can keep up to ${MAX_PRESETS} presets. Delete one to save another.` }, 400);
  const isDefault = body.isDefault === true || n === 0; // the first one is used for new videos
  const preset = await db.transaction(async (tx) => {
    if (isDefault) await tx.update(stylePresets).set({ isDefault: false }).where(and(eq(stylePresets.userId, u.id), eq(stylePresets.isDefault, true)));
    const [p] = await tx.insert(stylePresets).values({ userId: u.id, name, styleId: body.styleId, custom: presetLook(body.custom), isDefault }).returning(fields);
    return p;
  });
  return json({ preset }, 201);
}
