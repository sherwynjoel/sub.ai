/**
 * API keys and connection settings, editable from /admin → Connections.
 * Stored AES-256-GCM encrypted in the settings table; the env var of the same name is the fallback.
 * The encryption key lives in SETTINGS_SECRET, or is generated once into storage/.settings-key.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq, like } from "drizzle-orm";
import { db, settings } from "@/db";
import { STORAGE } from "@/lib/media";

export const CONNECTIONS = {
  GEMINI_API_KEY: { group: "ai", label: "Google Gemini API key", secret: true, help: "aistudio.google.com/apikey" },
  OPENAI_API_KEY: { group: "ai", label: "OpenAI API key", secret: true, help: "platform.openai.com/api-keys" },
  SARVAM_API_KEY: { group: "ai", label: "Sarvam AI API key", secret: true, help: "dashboard.sarvam.ai → API keys" },
  GROQ_API_KEY: { group: "ai", label: "Groq API key", secret: true, help: "console.groq.com/keys" },
  AI_BASE_URL: { group: "ai", label: "Custom AI base URL", secret: false, help: "Any OpenAI-compatible API, e.g. https://openrouter.ai/api/v1" },
  AI_API_KEY: { group: "ai", label: "Custom AI API key", secret: true, help: "Key for the custom base URL" },
  RAZORPAY_KEY_ID: { group: "razorpay", label: "Razorpay key ID", secret: false, help: "Dashboard → Account & Settings → API keys" },
  RAZORPAY_KEY_SECRET: { group: "razorpay", label: "Razorpay key secret", secret: true, help: "Shown once when you generate the key" },
  RAZORPAY_WEBHOOK_SECRET: { group: "razorpay", label: "Razorpay webhook secret", secret: true, help: "The secret you typed when adding the webhook" },
  RAZORPAY_PLAN_CREATOR: { group: "razorpay", label: "Creator plan ID", secret: false, help: "plan_… from Subscriptions → Plans" },
  RAZORPAY_PLAN_PRO: { group: "razorpay", label: "Pro plan ID", secret: false, help: "plan_…" },
  RAZORPAY_PLAN_STUDIO: { group: "razorpay", label: "Studio plan ID", secret: false, help: "plan_…" },
} as const;

export type ConnectionName = keyof typeof CONNECTIONS;
const PREFIX = "secret:";

let cachedKey: Buffer | null = null;
function masterKey() {
  if (cachedKey) return cachedKey;
  let raw = process.env.SETTINGS_SECRET;
  if (!raw) {
    const file = join(STORAGE, ".settings-key");
    if (!existsSync(file)) {
      mkdirSync(STORAGE, { recursive: true });
      writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
    }
    raw = readFileSync(file, "utf8").trim();
  }
  return (cachedKey = createHash("sha256").update(raw).digest());
}

export function encrypt(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", masterKey(), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string) {
  const [iv, tag, body] = blob.split(".").map((s) => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", masterKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

/** Admin value if set, else the env var, else "". */
export async function getSecret(name: ConnectionName): Promise<string> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PREFIX + name));
  if (row) {
    try {
      return decrypt(row.value);
    } catch {
      console.error(`Can't decrypt ${name}: the settings key changed. Re-enter it in /admin.`);
    }
  }
  return process.env[name] ?? "";
}

/** Empty value removes the admin value (falls back to env). */
export async function setSecret(name: ConnectionName, value: string) {
  const key = PREFIX + name;
  if (!value) return db.delete(settings).where(eq(settings.key, key));
  const v = encrypt(value);
  await db.insert(settings).values({ key, value: v }).onConflictDoUpdate({ target: settings.key, set: { value: v } });
}

const mask = (v: string) => (v.length <= 8 ? "••••" : `${v.slice(0, 4)}••••${v.slice(-4)}`);

/** What the admin UI may see: where each value comes from, masked for secrets. */
export async function connectionStatus() {
  const rows = await db.select().from(settings).where(like(settings.key, `${PREFIX}%`));
  const stored = new Map(rows.map((r) => [r.key.slice(PREFIX.length), r.value]));
  return (Object.keys(CONNECTIONS) as ConnectionName[]).map((name) => {
    const meta = CONNECTIONS[name];
    let value = "";
    let source: "admin" | "env" | null = null;
    if (stored.has(name)) {
      try { value = decrypt(stored.get(name)!); source = "admin"; } catch { /* unreadable → treat as unset */ }
    }
    if (!source && process.env[name]) { value = process.env[name]!; source = "env"; }
    return { name, ...meta, source, display: value ? (meta.secret ? mask(value) : value) : "" };
  });
}
