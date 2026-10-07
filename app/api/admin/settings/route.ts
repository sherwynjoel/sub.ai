import { currentUser, json } from "@/lib/auth";
import { PROVIDERS, saveAiConfig } from "@/lib/ai";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u?.isAdmin) return json({ error: "Admins only." }, 403);
  const { provider, model, sttModel } = await req.json().catch(() => ({}));
  if (!PROVIDERS.includes(provider) || !String(model ?? "").trim()) return json({ error: "Pick a provider and model." }, 400);
  await saveAiConfig({ provider, model: String(model).trim(), sttModel: String(sttModel ?? "").trim() });
  return json({ ok: true });
}
