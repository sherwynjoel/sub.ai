CREATE TABLE "page_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"source" text,
	"visitor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "page_views_day_idx" ON "page_views" USING btree ("day");