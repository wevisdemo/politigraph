CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"via" text NOT NULL,
	"credential_id" text,
	"operation_name" text,
	"changes" jsonb NOT NULL,
	"node_ids" text[] DEFAULT '{}' NOT NULL,
	"errors" jsonb,
	CONSTRAINT "audit_logs_via_check" CHECK ("audit_logs"."via" in ('session', 'api_key'))
);
--> statement-breakpoint
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_nodeIds_idx" ON "audit_logs" USING gin ("node_ids");