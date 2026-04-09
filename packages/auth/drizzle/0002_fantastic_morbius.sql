DROP INDEX "account_userid_idx";--> statement-breakpoint
DROP INDEX "apikey_userid_idx";--> statement-breakpoint
DROP INDEX "apikey_key_idx";--> statement-breakpoint
DROP INDEX "session_token_idx";--> statement-breakpoint
DROP INDEX "session_userid_idx";--> statement-breakpoint
DROP INDEX "user_email_idx";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
ALTER TABLE "jwkss" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikeys_key_idx" ON "apikeys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "apikeys_userId_idx" ON "apikeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");