ALTER TABLE "users" ADD COLUMN "referral_status" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_on" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_minutes" integer;--> statement-breakpoint
UPDATE "users" SET "referral_status" = CASE WHEN "referral_rewarded_at" IS NULL THEN 'pending' ELSE 'approved' END WHERE "referred_by" IS NOT NULL;
