import type { CaptionCustom } from "@/lib/captionStyles";
import { pgTable, text, uuid, integer, real, boolean, timestamp, jsonb, date, bigserial, index } from "drizzle-orm/pg-core";

/**
 * `ta` is the line in the project's language (see lib/languages.ts); `en` is English. `w` / `we`: when each word of
 * `ta` / `en` starts (seconds, from the audio: lib/subtitles.ts wordStarts), when known. `anchor` (only while a job
 * runs): the start is the speech model's own timestamp, not an estimate.
 */
export type Cue = {
  start: number; end: number; ta: string; en: string; w?: number[]; we?: number[]; anchor?: boolean;
  style?: CaptionCustom;        // this caption's own look, over the project's (font, size, colours, position…)
  wc?: (string | null)[];       // colour of each word of `ta` (null = the style's own)
  wce?: (string | null)[];      // colour of each word of `en`
};

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
  language: text("language").notNull().default("ta-IN"), // subtitle language code
  script: text("script").notNull().default("mixed"), // how the main line is written: mixed | roman | native (lib/ai/shared.ts)
  withEnglish: boolean("with_english").notNull().default(true), // add an English line
  durationSec: real("duration_sec").notNull(),
  status: text("status").notNull().default("queued"), // queued | processing | done | failed
  progress: integer("progress").notNull().default(0),
  provider: text("provider"),
  model: text("model"),
  error: text("error"),
  cues: jsonb("cues").$type<Cue[]>(),
  captionStyle: text("caption_style").notNull().default("minimal"), // lib/captionStyles.ts id
  captionCustom: jsonb("caption_custom").$type<CaptionCustom>().notNull().default({}), // user edits on top of the style
  renderStatus: text("render_status"), // null | queued | rendering | done | failed (styled MP4)
  renderLang: text("render_lang").notNull().default("both"), // ta | en | both
  renderProgress: integer("render_progress").notNull().default(0),
  renderPath: text("render_path"),
  renderError: text("render_error"),
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

/**
 * Page visits, counted without cookies (components/Track.tsx → /api/hit). `visitor` is a hash of the IP address and
 * browser with a salt that changes every day, so a visitor counts once a day and can't be followed across days.
 */
export const pageViews = pgTable("page_views", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  day: date("day").notNull(),
  path: text("path").notNull(),
  referrer: text("referrer"), // the other site's host name only
  source: text("source"), // ?utm_source= or ?ref=
  visitor: text("visitor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("page_views_day_idx").on(t.day)]);

/** One-time password reset links (lib/reset.ts). Only a hash of the link's token is kept. */
export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
