import type { CaptionCustom } from "@/lib/captionStyles";
import { pgTable, text, uuid, integer, real, boolean, timestamp, jsonb, date, bigserial, index, bigint } from "drizzle-orm/pg-core";

/**
 * `ta` is the line in the project's language (see lib/languages.ts); `en` is English. `w` / `we`: when each word of
 * `ta` / `en` starts (seconds, from the audio: lib/subtitles.ts wordStarts), when known. `anchor` (only while a job
 * runs): the start is the speech model's own timestamp, not an estimate.
 */
export type Cue = {
  start: number; end: number; ta: string; en: string; w?: number[]; we?: number[]; anchor?: boolean;
  aligned?: boolean;            // job time only: timed from its words in the audio (lib/align.ts), not estimated
  style?: CaptionCustom;        // this caption's own look, over the project's (font, size, colours, position…)
  wc?: (string | null)[];       // colour of each word of `ta` (null = the style's own)
  wce?: (string | null)[];      // colour of each word of `en`
  wf?: (WordLook | null)[];     // font, size, weight and slant of each word of `ta` picked out on the video (null = as the caption)
  wfe?: (WordLook | null)[];    // the same for each word of `en`
};
/** One word's own look: a caption font, a size (× the caption's), bold, italic. */
export type WordLook = { font?: string; size?: number; bold?: boolean; italic?: boolean };

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
  signupIp: text("signup_ip"), // limits how many free trials one connection can start (api/auth/signup)
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }), // the free minutes start once set (lib/verify.ts)
  blockedAt: timestamp("blocked_at", { withTimezone: true }), // set by an admin: can't sign in or use the plugin key
  blockReason: text("block_reason"),
  adminNote: text("admin_note"), // the admins' own notes on this user; never shown to them
  noNews: boolean("no_news").notNull().default(false), // unsubscribed from emails sent by admins to groups (lib/news.ts)
  referralCode: text("referral_code").unique(), // their invite link's code, made the first time it's shown (lib/referral.ts)
  referredBy: uuid("referred_by"), // who invited them
  referralRewardedAt: timestamp("referral_rewarded_at", { withTimezone: true }), // when their first paid pass gave both the invite minutes
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("users_signup_ip_idx").on(t.signupIp, t.createdAt)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  filePath: text("file_path"), // null once purged (or while the video is still arriving, see videoTotal)
  audioPath: text("audio_path"), // the sound alone, sent first from phones (lib/audioTrack.ts): captions start from it
  videoTotal: bigint("video_total", { mode: "number" }), // size of a video still arriving in pieces (api/jobs/[id]/video); null when it's here
  previewPath: text("preview_path"), // a light copy the editor plays (lib/media.ts makePreview): null = not made yet, "" = plays the original
  mime: text("mime").notNull().default("video/mp4"),
  language: text("language").notNull().default("ta-IN"), // subtitle language code
  script: text("script").notNull().default("mixed"), // how the main line is written: mixed | roman | native | translated (lib/captionTypes.ts)
  withEnglish: boolean("with_english").notNull().default(true), // add an English line
  redos: integer("redos").notNull().default(0), // captions redone from the video with another caption type (lib/captionTypes.ts)
  durationSec: real("duration_sec").notNull(),
  status: text("status").notNull().default("queued"), // queued | processing | done | failed
  progress: integer("progress").notNull().default(0),
  provider: text("provider"),
  model: text("model"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }), // when the worker last picked it up
  finishedAt: timestamp("finished_at", { withTimezone: true }), // when that run ended (done or failed): how long making subtitles takes
  cues: jsonb("cues").$type<Cue[]>(),
  speech: jsonb("speech").$type<[number, number][]>(), // where someone speaks, for the editor's timing check (lib/timing.ts)
  levels: text("levels"), // the sound's shape for the timeline (lib/waveform.ts); measured on first look
  captionStyle: text("caption_style").notNull().default("minimal"), // lib/captionStyles.ts id
  captionCustom: jsonb("caption_custom").$type<CaptionCustom>().notNull().default({}), // user edits on top of the style
  renderStatus: text("render_status"), // null | queued | rendering | done | failed (styled MP4)
  renderLang: text("render_lang").notNull().default("both"), // ta | en | both
  renderProgress: integer("render_progress").notNull().default(0),
  renderPath: text("render_path"),
  renderError: text("render_error"),
  overlayStatus: text("overlay_status"), // null | queued | rendering | done | failed (the styled captions alone, for the Adobe panel)
  overlayKey: text("overlay_key"), // what it was made from (lib/overlay.ts): the same again needs no new render
  overlayLang: text("overlay_lang").notNull().default("both"),
  overlayProgress: integer("overlay_progress").notNull().default(0),
  overlayPath: text("overlay_path"),
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

/** One-time links that confirm a user's email (lib/verify.ts). Only a hash of the link's token is kept. */
export const emailChecks = pgTable("email_checks", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A user's saved looks ("My brand"): a caption style and its customisation (no video-specific parts: canvas, text
 * layers, logo). The default one is applied to every new upload.
 */
export const stylePresets = pgTable("style_presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  styleId: text("style_id").notNull(),
  custom: jsonb("custom").$type<CaptionCustom>().notNull().default({}),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("style_presets_user_idx").on(t.userId)]);

/**
 * What the admin's Styles page counts, kept for good: a finished video export ("export", at = when) or a finished
 * project deleted ("project_deleted", at = when it was made). No foreign keys, so a row outlives its project.
 */
export const styleEvents = pgTable("style_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  style: text("style").notNull(),
  jobId: uuid("job_id").notNull(),
  userId: uuid("user_id").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("style_events_kind_idx").on(t.kind, t.at)]);

/**
 * Every use of a user's minutes (lib/credits.ts): `seconds` taken (a negative number when given back), what for
 * (`kind`: upload | translate | remake | extra | refund) and the video's name then, so the history stays when the
 * project is deleted.
 */
export const creditLog = pgTable("credit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id"),
  video: text("video").notNull(),
  kind: text("kind").notNull(),
  detail: text("detail"),
  seconds: integer("seconds").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("credit_log_user_idx").on(t.userId, t.createdAt)]);

/** What happened to each email the site tried to send, and each reset asked for an address with no account (admin only). */
export const emailLog = pgTable("email_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  result: text("result").notNull(), // sent | no-account | failed
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every change an admin makes (to an account, a project or the site), and who made it. */
export const adminLog = pgTable("admin_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  adminEmail: text("admin_email").notNull(),
  userId: uuid("user_id"), // the account it was about, if any (kept after the account is deleted)
  userEmail: text("user_email"),
  action: text("action").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Discount codes for one-time payments (api/billing/order): a percentage off, optionally limited in uses and time. */
export const coupons = pgTable("coupons", {
  code: text("code").primaryKey(), // upper case
  percent: integer("percent").notNull(), // 1..90
  maxUses: integer("max_uses"), // null: no limit
  uses: integer("uses").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
