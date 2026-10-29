ALTER TABLE "users" ADD COLUMN "signup_ip" text;--> statement-breakpoint
CREATE INDEX "users_signup_ip_idx" ON "users" USING btree ("signup_ip","created_at");