ALTER TABLE "messages" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_idempotency_key_unique" UNIQUE("idempotency_key");