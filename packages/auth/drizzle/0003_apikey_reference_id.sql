ALTER TABLE "apikeys" RENAME COLUMN "user_id" TO "reference_id";--> statement-breakpoint
ALTER TABLE "apikeys" DROP CONSTRAINT "apikeys_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "apikeys_userId_idx";--> statement-breakpoint
ALTER TABLE "apikeys" ADD COLUMN "config_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "jwkss" ADD COLUMN "alg" text;--> statement-breakpoint
ALTER TABLE "jwkss" ADD COLUMN "crv" text;--> statement-breakpoint
ALTER TABLE "apikeys" ADD CONSTRAINT "apikeys_reference_id_users_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apikeys_configId_idx" ON "apikeys" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "apikeys_referenceId_idx" ON "apikeys" USING btree ("reference_id");