CREATE TABLE "admin_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"admin_email" text NOT NULL,
	"user_id" uuid,
	"user_email" text,
	"action" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "block_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_note" text;