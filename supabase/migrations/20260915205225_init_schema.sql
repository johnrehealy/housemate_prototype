CREATE TYPE "public"."actor_type" AS ENUM('member', 'staff', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."alert_kind" AS ENUM('member_over_budget', 'worker_error');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('received', 'queued', 'sent', 'delivered', 'undelivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('member', 'staff');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('invited', 'active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."message_author" AS ENUM('member', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('sms', 'web');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."outbound_kind" AS ENUM('reply', 'proactive');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('sms', 'web', 'agent_run', 'system');--> statement-breakpoint
CREATE TYPE "public"."usage_kind" AS ENUM('claude', 'twilio');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"source_type" "source_type" NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "alert_kind" NOT NULL,
	"member_id" uuid,
	"dedupe_key" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notified_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"subject" text,
	"status" "conversation_status" DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "homes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "homes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"home_id" uuid,
	"phone" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"status" "member_status" DEFAULT 'invited' NOT NULL,
	"sms_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "members_phone_unique" UNIQUE("phone"),
	CONSTRAINT "members_phone_e164" CHECK ("members"."phone" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "members_home_required" CHECK ("members"."role" = 'staff' or "members"."home_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid,
	"member_id" uuid,
	"conversation_id" uuid,
	"direction" "message_direction" NOT NULL,
	"channel" "message_channel" NOT NULL,
	"author" "message_author" NOT NULL,
	"outbound_kind" "outbound_kind",
	"body" text DEFAULT '' NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"from_phone" text,
	"to_phone" text,
	"provider_sid" text,
	"delivery_status" "delivery_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_provider_sid_unique" UNIQUE("provider_sid"),
	CONSTRAINT "messages_outbound_kind" CHECK (("messages"."direction" = 'outbound') = ("messages"."outbound_kind" is not null))
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "usage_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid,
	"member_id" uuid,
	"kind" "usage_kind" NOT NULL,
	"amount_usd" numeric(12, 6) NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_costs_amount_non_negative" CHECK ("usage_costs"."amount_usd" >= 0)
);
--> statement-breakpoint
ALTER TABLE "usage_costs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_costs" ADD CONSTRAINT "usage_costs_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_costs" ADD CONSTRAINT "usage_costs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_entity_idx" ON "activity_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_home_id_created_at_idx" ON "activity_events" USING btree ("home_id","created_at");--> statement-breakpoint
CREATE INDEX "conversations_home_id_last_message_at_idx" ON "conversations" USING btree ("home_id","last_message_at");--> statement-breakpoint
CREATE INDEX "members_home_id_idx" ON "members" USING btree ("home_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_home_id_created_at_idx" ON "messages" USING btree ("home_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_costs_ref_idx" ON "usage_costs" USING btree ("kind","ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "usage_costs_member_id_occurred_at_idx" ON "usage_costs" USING btree ("member_id","occurred_at");