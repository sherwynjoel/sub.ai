ALTER TABLE "users" ADD COLUMN "invite_seen_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "invite_seen_at" = now() WHERE "id" IN (SELECT "user_id" FROM "credit_log" WHERE "video" = 'Invite reward' AND "seconds" < 0 AND "created_at" < now() - interval '1 day');
