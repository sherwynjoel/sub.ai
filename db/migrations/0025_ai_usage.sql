CREATE TABLE "ai_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run" uuid NOT NULL,
	"video_sec" real DEFAULT 0 NOT NULL,
	"job_id" uuid,
	"user_id" uuid,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"audio_sec" real DEFAULT 0 NOT NULL,
	"in_tok" integer DEFAULT 0 NOT NULL,
	"audio_tok" integer DEFAULT 0 NOT NULL,
	"out_tok" integer DEFAULT 0 NOT NULL,
	"chars" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_job_idx" ON "ai_usage" USING btree ("job_id");