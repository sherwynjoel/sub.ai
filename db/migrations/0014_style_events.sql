CREATE TABLE "style_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"style" text NOT NULL,
	"job_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "style_events_kind_idx" ON "style_events" USING btree ("kind","at");--> statement-breakpoint
-- Exports from before this table: render_progress stays at 100 after a finished export, even once the 7-day clean-up
-- has cleared render_status. A project can only show one, so repeat exports from before now aren't recoverable.
INSERT INTO "style_events" ("kind", "style", "job_id", "user_id", "at")
SELECT 'export', "caption_style", "id", "user_id", "updated_at" FROM "jobs"
WHERE "render_progress" = 100 AND ("render_status" IS NULL OR "render_status" IN ('done', 'stale'));
