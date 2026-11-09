CREATE TABLE "credit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"video" text NOT NULL,
	"kind" text NOT NULL,
	"detail" text,
	"seconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_log" ADD CONSTRAINT "credit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_log_user_idx" ON "credit_log" USING btree ("user_id","created_at");--> statement-breakpoint
-- The history so far: each project still here that made subtitles (a failed one's minutes were given back).
INSERT INTO "credit_log" ("user_id", "job_id", "video", "kind", "seconds", "created_at")
SELECT "user_id", "id", "filename", 'upload', CEIL("duration_sec")::integer, "created_at" FROM "jobs" WHERE "status" <> 'failed';
