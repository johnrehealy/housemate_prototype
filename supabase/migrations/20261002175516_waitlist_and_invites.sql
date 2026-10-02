CREATE TYPE "public"."invite_delivery" AS ENUM('email', 'page');--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"delivery" "invite_delivery" NOT NULL,
	"email" text NOT NULL,
	"waitlist_signup_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"member_id" uuid,
	CONSTRAINT "invites_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "invites_email" CHECK ("invites"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
	CONSTRAINT "invites_used_with_member" CHECK (("invites"."used_at" is null) = ("invites"."member_id" is null))
);
--> statement-breakpoint
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "homes" ADD COLUMN "place_id" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "address_unit" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "zip" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "place_id" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "sms_consent_version" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "sms_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_waitlist_signup_id_waitlist_signups_id_fk" FOREIGN KEY ("waitlist_signup_id") REFERENCES "public"."waitlist_signups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_waitlist_signup_id_idx" ON "invites" USING btree ("waitlist_signup_id");--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD CONSTRAINT "waitlist_signups_approved_by_members_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_email" CHECK ("members"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD CONSTRAINT "waitlist_signups_phone_e164" CHECK ("waitlist_signups"."phone" ~ '^\+[1-9][0-9]{7,14}$');--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD CONSTRAINT "waitlist_signups_sms_consent" CHECK (("waitlist_signups"."sms_consent_at" is null) = ("waitlist_signups"."sms_consent_version" is null)
        and ("waitlist_signups"."sms_consent_at" is null or "waitlist_signups"."phone" is not null));--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD CONSTRAINT "waitlist_signups_approved" CHECK (("waitlist_signups"."approved_at" is null) = ("waitlist_signups"."approved_by" is null));