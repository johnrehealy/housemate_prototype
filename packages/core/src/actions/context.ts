import type { Tx } from "../db/client";
import type { SmsProvider } from "../sms/types";

/**
 * Anything that can run a transaction: the database connection in the app, or
 * an already-open transaction in tests, so test data rolls back.
 */
export interface Transactional {
  transaction<T>(run: (tx: Tx) => Promise<T>): Promise<T>;
}

/** Who is acting. Recorded on every activity event. */
export type Actor =
  | { type: "member"; id: string }
  | { type: "staff"; id: string }
  | { type: "agent"; runId: string }
  | { type: "system" };

/** Where the action came from. Recorded on every activity event. */
export type Source =
  | { type: "sms"; messageId?: string }
  | { type: "web" }
  | { type: "agent_run"; runId: string }
  | { type: "system" };

/** Creates the Supabase Auth user that a member signs in with. */
export interface AuthAdmin {
  createUser(input: { phone: string }): Promise<{ userId: string }>;
  deleteUser(userId: string): Promise<void>;
}

/** Everything an action may reach outside the database. */
export type Services = {
  auth: AuthAdmin;
  sms: SmsProvider;
};

export type ActionContext = {
  db: Transactional;
  actor: Actor;
  source: Source;
  services: Services;
  /** Injectable clock, so tests can pin the time. */
  now?: Date;
};

export function actorColumns(actor: Actor): {
  actorType: "member" | "staff" | "agent" | "system";
  actorId: string | null;
} {
  switch (actor.type) {
    case "member":
    case "staff":
      return { actorType: actor.type, actorId: actor.id };
    case "agent":
      return { actorType: "agent", actorId: actor.runId };
    case "system":
      return { actorType: "system", actorId: null };
  }
}

export function sourceColumns(source: Source): {
  sourceType: "sms" | "web" | "agent_run" | "system";
  sourceId: string | null;
} {
  switch (source.type) {
    case "sms":
      return { sourceType: "sms", sourceId: source.messageId ?? null };
    case "agent_run":
      return { sourceType: "agent_run", sourceId: source.runId };
    case "web":
    case "system":
      return { sourceType: source.type, sourceId: null };
  }
}
