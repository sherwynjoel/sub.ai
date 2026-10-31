import { and, eq } from "drizzle-orm";
import { db, stylePresets } from "@/db";
import { currentUser, json, unauthorized } from "@/lib/auth";
import { knownStyle, presetLook, presetName } from "@/lib/presets";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rename it, make it (or stop it being) the look for new videos, or overwrite its look: { name?, isDefault?, styleId?, custom? }. */
export async function PATCH(req: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const id = (await params).id;
  if (!UUID.test(id)) return json({ error: "Not found" }, 404);
  const body = await req.json().catch(() => ({}));
  const set: Partial<typeof stylePresets.$inferInsert> = {};
  if (body.name !== undefined) { const n = presetName(body.name); if (!n) return json({ error: "Give the preset a name." }, 400); set.name = n; }
  if (body.styleId !== undefined) { if (!knownStyle(body.styleId)) return json({ error: "Unknown style." }, 400); set.styleId = body.styleId; set.custom = presetLook(body.custom); }
  if (typeof body.isDefault === "boolean") set.isDefault = body.isDefault;
  const mine = and(eq(stylePresets.id, id), eq(stylePresets.userId, u.id));
  const preset = await db.transaction(async (tx) => {
    if (set.isDefault) await tx.update(stylePresets).set({ isDefault: false }).where(and(eq(stylePresets.userId, u.id), eq(stylePresets.isDefault, true)));
    const [p] = await tx.update(stylePresets).set(set).where(mine).returning({ id: stylePresets.id, name: stylePresets.name, styleId: stylePresets.styleId, custom: stylePresets.custom, isDefault: stylePresets.isDefault });
    return p;
  });
  return preset ? json({ preset }) : json({ error: "Not found" }, 404);
}

export async function DELETE(_: Request, { params }: Ctx) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const id = (await params).id;
  if (!UUID.test(id)) return json({ error: "Not found" }, 404);
  const gone = await db.delete(stylePresets).where(and(eq(stylePresets.id, id), eq(stylePresets.userId, u.id))).returning({ id: stylePresets.id });
  return gone.length ? json({ ok: true }) : json({ error: "Not found" }, 404);
}
