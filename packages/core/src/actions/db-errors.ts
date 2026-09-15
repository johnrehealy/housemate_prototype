import { ActionError } from "./errors";

type PostgresError = Error & {
  code?: string;
  constraint_name?: string;
};

/** Finds the underlying Postgres error, which Drizzle wraps in its own. */
function postgresError(error: unknown): PostgresError | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (typeof (current as PostgresError).code === "string") {
      return current as PostgresError;
    }
  }
  return undefined;
}

/** Turns database constraint failures into action errors callers can act on. */
export function mapDbError(error: unknown): unknown {
  const pg = postgresError(error);
  if (!pg) return error;

  if (pg.message.includes("limited to 10 members")) {
    return new ActionError(
      "member_cap",
      "The pilot is limited to 10 members.",
      { cause: error },
    );
  }
  if (pg.code === "23505") {
    return new ActionError(
      "conflict",
      `That record already exists (${pg.constraint_name ?? "unique constraint"}).`,
      { cause: error },
    );
  }
  if (pg.code === "23514") {
    return new ActionError(
      "invalid_input",
      `A database check rejected this (${pg.constraint_name ?? "check constraint"}).`,
      { cause: error },
    );
  }
  return error;
}
