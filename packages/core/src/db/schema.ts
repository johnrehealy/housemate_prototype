import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// Every table enables row-level security here, so none is ever created open.
// Policies, grants and triggers are in hand-written SQL migrations.

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const memberRole = pgEnum("member_role", ["member", "staff"]);
export const memberStatus = pgEnum("member_status", [
  "invited",
  "active",
  "removed",
]);
export const conversationStatus = pgEnum("conversation_status", [
  "open",
  "closed",
]);
export const messageDirection = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);
export const messageChannel = pgEnum("message_channel", ["sms", "web"]);
export const messageAuthor = pgEnum("message_author", [
  "member",
  "agent",
  "system",
]);
export const outboundKind = pgEnum("outbound_kind", ["reply", "proactive"]);
export const deliveryStatus = pgEnum("delivery_status", [
  "received",
  "queued",
  "sent",
  "delivered",
  "undelivered",
  "failed",
]);
export const actorType = pgEnum("actor_type", [
  "member",
  "staff",
  "agent",
  "system",
]);
export const sourceType = pgEnum("source_type", [
  "sms",
  "web",
  "agent_run",
  "system",
]);
export const usageKind = pgEnum("usage_kind", ["claude", "twilio"]);
export const alertKind = pgEnum("alert_kind", [
  "member_over_budget",
  "worker_error",
]);

/** The pattern every stored email address must match. `toEmail` checks the same. */
const emailPattern = (column: AnyPgColumn) =>
  sql`${column} ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'`;

export const homes = pgTable("homes", {
  id: id(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  /**
   * The Google Places ID of the address, when the member picked it from the
   * search rather than typing it (D-068). Google's terms allow keeping this
   * indefinitely; the address itself is kept as the home's record anyway.
   */
  placeId: text("place_id"),
  /** IANA timezone, e.g. America/New_York. Drives quiet hours and budget months. */
  timezone: text("timezone").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const members = pgTable(
  "members",
  {
    id: id(),
    /** The Supabase Auth account they sign in with, by a texted or emailed code (D-073). */
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    /** Null only for staff, who don't belong to a home. */
    homeId: uuid("home_id").references(() => homes.id, {
      onDelete: "restrict",
    }),
    /**
     * Optional since D-074: a member who gave no number signs in by email and
     * gets no texts.
     */
    phone: text("phone").unique(),
    /**
     * The address they joined with (D-072). Lowercased. Null for staff added by
     * script, who may have none.
     */
    email: text("email").unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    role: memberRole("role").notNull().default("member"),
    status: memberStatus("status").notNull().default("invited"),
    smsConsentAt: timestamp("sms_consent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    check("members_phone_e164", sql`${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
    check("members_email", emailPattern(table.email)),
    check(
      "members_home_required",
      sql`${table.role} = 'staff' or ${table.homeId} is not null`,
    ),
    index("members_home_id_idx").on(table.homeId),
  ],
).enableRLS();

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "restrict" }),
    /** Set by the agent once it knows what the conversation is about. */
    subject: text("subject"),
    status: conversationStatus("status").notNull().default("open"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("conversations_home_id_last_message_at_idx").on(
      table.homeId,
      table.lastMessageAt,
    ),
  ],
).enableRLS();

export type MessageMedia = { url: string; contentType: string };

export const messages = pgTable(
  "messages",
  {
    id: id(),
    /** Null for texts from numbers that aren't invited; those stay staff-only. */
    homeId: uuid("home_id").references(() => homes.id, {
      onDelete: "restrict",
    }),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "restrict",
    }),
    /** Null until the message is assigned to a conversation. */
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "restrict",
    }),
    direction: messageDirection("direction").notNull(),
    channel: messageChannel("channel").notNull(),
    author: messageAuthor("author").notNull(),
    /** Set on outbound messages only; proactive texts obey quiet hours. */
    outboundKind: outboundKind("outbound_kind"),
    body: text("body").notNull().default(""),
    media: jsonb("media")
      .$type<MessageMedia[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    fromPhone: text("from_phone"),
    toPhone: text("to_phone"),
    /** Twilio or simulator message ID. Unique, so repeated webhooks are ignored. */
    providerSid: text("provider_sid").unique(),
    deliveryStatus: deliveryStatus("delivery_status").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "messages_outbound_kind",
      sql`(${table.direction} = 'outbound') = (${table.outboundKind} is not null)`,
    ),
    index("messages_conversation_id_created_at_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("messages_home_id_created_at_idx").on(table.homeId, table.createdAt),
  ],
).enableRLS();

/** Append-only record of every change: who, through which channel, before and after. */
export const activityEvents = pgTable(
  "activity_events",
  {
    id: id(),
    homeId: uuid("home_id").references(() => homes.id, {
      onDelete: "restrict",
    }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    actorType: actorType("actor_type").notNull(),
    actorId: uuid("actor_id"),
    sourceType: sourceType("source_type").notNull(),
    sourceId: uuid("source_id"),
    createdAt: createdAt(),
  },
  (table) => [
    index("activity_events_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("activity_events_home_id_created_at_idx").on(
      table.homeId,
      table.createdAt,
    ),
  ],
).enableRLS();

export const usageCosts = pgTable(
  "usage_costs",
  {
    id: id(),
    homeId: uuid("home_id").references(() => homes.id, {
      onDelete: "restrict",
    }),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "restrict",
    }),
    kind: usageKind("kind").notNull(),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 6 }).notNull(),
    /** What the cost is for, e.g. ref_type "message" with the provider SID. */
    refType: text("ref_type").notNull(),
    refId: text("ref_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check("usage_costs_amount_non_negative", sql`${table.amountUsd} >= 0`),
    // Recording the same cost twice is a no-op.
    uniqueIndex("usage_costs_ref_idx").on(
      table.kind,
      table.refType,
      table.refId,
    ),
    index("usage_costs_member_id_occurred_at_idx").on(
      table.memberId,
      table.occurredAt,
    ),
  ],
).enableRLS();

export const alerts = pgTable("alerts", {
  id: id(),
  kind: alertKind("kind").notNull(),
  memberId: uuid("member_id").references(() => members.id, {
    onDelete: "restrict",
  }),
  /** Makes an alert fire once, e.g. one over-budget alert per member per month. */
  dedupeKey: text("dedupe_key").notNull().unique(),
  detail: jsonb("detail")
    .notNull()
    .default(sql`'{}'::jsonb`),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
}).enableRLS();

/**
 * The waitlist (D-072): everyone who has been through Get started without
 * getting an account yet. Nobody here is a member, so the row stands alone,
 * with no home and no member.
 *
 * Rows from the landing page's old email bar (D-061) hold only an email; the
 * details are null until that person goes through Get started. The row is the
 * one saved copy of what they gave, and it's deleted when their account is
 * created (open question 27).
 */
export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: id(),
    /** Lowercased and trimmed by the action, so one address is one row. */
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    /** Optional (D-074). Unconfirmed until the code. */
    phone: text("phone"),
    addressLine1: text("address_line1"),
    addressUnit: text("address_unit"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    /** Set when the address was picked from the search, not typed. */
    placeId: text("place_id"),
    timezone: text("timezone"),
    /** The Terms they agreed to on Get started (`TERMS_VERSION`). */
    termsVersion: text("terms_version"),
    /**
     * Their agreement to texts, from G3's box (D-074): the wording's version
     * and when they ticked it. It becomes the member's consent record, at this
     * time, when their account is created. Both null when the box wasn't ticked.
     */
    smsConsentVersion: text("sms_consent_version"),
    smsConsentAt: timestamp("sms_consent_at", { withTimezone: true }),
    /** On the alpha list: let in by staff (D-072). */
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => members.id, {
      onDelete: "restrict",
    }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("waitlist_signups_email", emailPattern(table.email)),
    check(
      "waitlist_signups_phone_e164",
      sql`${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
    check(
      "waitlist_signups_sms_consent",
      sql`(${table.smsConsentAt} is null) = (${table.smsConsentVersion} is null)
        and (${table.smsConsentAt} is null or ${table.phone} is not null)`,
    ),
    check(
      "waitlist_signups_approved",
      sql`(${table.approvedAt} is null) = (${table.approvedBy} is null)`,
    ),
  ],
).enableRLS();

/**
 * How an invite reached its holder (D-072). An emailed link (staff let them
 * in) proves the address; one handed straight to the page (an alpha-list
 * visitor on the website) doesn't.
 */
export const inviteDelivery = pgEnum("invite_delivery", ["email", "page"]);

/**
 * Single-use links that let someone off the waitlist set up their account
 * (D-072). Letting someone in on /ops/waitlist makes one and emails it. An
 * alpha-list visitor who finishes Get started on the website gets one straight
 * away, handed to the page.
 *
 * Only a hash of the link's token is kept, so this table can't be used to
 * open anyone's link. A link works once and expires; a newer link for the
 * same waitlist entry replaces an unused older one.
 */
export const invites = pgTable(
  "invites",
  {
    id: id(),
    /** SHA-256 of the token in the link, hex-encoded. */
    tokenHash: text("token_hash").notNull().unique(),
    delivery: inviteDelivery("delivery").notNull(),
    /** Copied from the waitlist entry, which is deleted once the link is used. */
    email: text("email").notNull(),
    waitlistSignupId: uuid("waitlist_signup_id").references(
      () => waitlistSignups.id,
      { onDelete: "set null" },
    ),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /**
     * When the let-in email carrying it went out, so ops can say "Emailed" or
     * "Not emailed". Null for a link handed to the page, and for one whose
     * email didn't go (or mail is off) and was shown to staff to send.
     */
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    /** The member the link created. */
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [
    check("invites_email", emailPattern(table.email)),
    check(
      "invites_used_with_member",
      sql`(${table.usedAt} is null) = (${table.memberId} is null)`,
    ),
    index("invites_waitlist_signup_id_idx").on(table.waitlistSignupId),
  ],
).enableRLS();
