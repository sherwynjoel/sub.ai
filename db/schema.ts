import { pgTable, text, uuid, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

/** `ta` is the line in the project's language (see lib/languages.ts); `en` is English. */
export type Cue = { start: number; end: number; ta: string; en: string };

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  apiKeyHash: text("api_key_hash").unique(),
  apiKeyHint: text("api_key_hint"),
  plan: text("plan").notNull().default("free"),
  secondsUsed: integer("seconds_used").notNull().default(0),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  subscriptionId: text("subscription_id").unique(),
  subscriptionStatus: text("subscription_status"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  filePath: text("file_path"), // null once purged
  mime: text("mime").notNull().default("video/mp4"),
  language: text("language").notNull().default("ta-IN"), // subtitle language code, paired with English
  durationSec: real("duration_sec").notNull(),
  status: text("status").notNull().default("queued"), // queued | processing | done | failed
  progress: integer("progress").notNull().default(0),
  provider: text("provider"),
  model: text("model"),
  error: text("error"),
  cues: jsonb("cues").$type<Cue[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const billingEvents = pgTable("billing_events", {
  id: text("id").primaryKey(), // x-razorpay-event-id, for idempotency
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
