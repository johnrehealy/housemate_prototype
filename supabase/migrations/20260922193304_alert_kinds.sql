ALTER TYPE "public"."alert_kind" ADD VALUE 'pilot_over_budget' BEFORE 'worker_error';--> statement-breakpoint
ALTER TYPE "public"."alert_kind" ADD VALUE 'send_stuck';