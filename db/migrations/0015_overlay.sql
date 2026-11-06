ALTER TABLE "jobs" ADD COLUMN "overlay_status" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "overlay_key" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "overlay_lang" text DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "overlay_progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "overlay_path" text;