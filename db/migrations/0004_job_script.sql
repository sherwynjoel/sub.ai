ALTER TABLE "jobs" ADD COLUMN "script" text DEFAULT 'mixed' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "with_english" boolean DEFAULT true NOT NULL;