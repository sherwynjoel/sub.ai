CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"percent" integer NOT NULL,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "no_news" boolean DEFAULT false NOT NULL;