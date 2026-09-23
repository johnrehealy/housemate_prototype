import { sql } from "drizzle-orm";
import {
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

export const homes = pgTable("homes", {
  id: id(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  /** IANA timezone, e.g. America/New_York. Drives quiet hours and budget months. */
  timezone: text("timezone").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const members = pgTable(
  "members",
  {
    id: id(),
    /** Created at invite time; members sign in with a phone code. */
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    /** Null only for staff, who don't belong to a home. */
    homeId: uuid("home_id").references(() => homes.id, {
      onDelete: "restrict",
    }),
    phone: text("phone").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    role: memberRole("role").notNull().default("member"),
    status: memberStatus("status").notNull().default("invited"),
    smsConsentAt: timestamp("sms_consent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    check("members_phone_e164", sql`${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
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
 * Addresses collected by the landing page's waitlist (D-061). Nobody here is a
 * member: a signup is a stranger asking to be told when there's room, so the
 * row has no home, no member and nothing else about them.
 */
export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: id(),
    /** Lowercased and trimmed by the action, so one address is one row. */
    email: text("email").notNull().unique(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "waitlist_signups_email",
      sql`${table.email} ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'`,
    ),
  ],
).enableRLS();
