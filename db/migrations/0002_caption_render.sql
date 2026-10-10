ALTER TABLE "jobs" ADD COLUMN "caption_style" text DEFAULT 'minimal' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "render_status" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "render_lang" text DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "render_progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "render_path" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "render_error" text;