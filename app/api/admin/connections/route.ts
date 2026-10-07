import { json } from "@/lib/auth";
import { adminOrNull } from "@/lib/admin";
import { CONNECTIONS, setSecret, type ConnectionName } from "@/lib/secrets";

/** Save (or clear, with an empty value) one API key / connection setting. */
export async function POST(req: Request) {
  if (!(await adminOrNull())) return json({ error: "Admins only." }, 403);
  const { name, value } = await req.json().catch(() => ({}));
  if (!(name in CONNECTIONS)) return json({ error: "Unknown setting." }, 400);
  const v = String(value ?? "").trim();
  if (v.length > 2000) return json({ error: "That value is too long." }, 400);
  if (name === "AI_BASE_URL" && v && !/^https?:\/\//.test(v)) return json({ error: "Enter a full URL starting with https://" }, 400);
  await setSecret(name as ConnectionName, v);
  return json({ ok: true });
}
