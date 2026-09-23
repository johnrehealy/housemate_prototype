CREATE TABLE "waitlist_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_signups_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_signups_email" CHECK ("waitlist_signups"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
--> statement-breakpoint
ALTER TABLE "waitlist_signups" ENABLE ROW LEVEL SECURITY;