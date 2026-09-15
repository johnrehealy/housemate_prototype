import { z } from "zod";
import type { Tx } from "../db/client";
import { activityEvents } from "../db/schema";
import { actorColumns, sourceColumns, type ActionContext } from "./context";
import { ActionError } from "./errors";

/**
 * Writes one activity event. Runs inside the action's transaction, so a
 * record and its history are saved together or not at all.
 */
export type RecordEvent = (event: {
  entityType: string;
  entityId: string;
  action: string;
  homeId?: string | null;
  before?: unknown;
  after?: unknown;
}) => Promise<void>;

export type ActionHandlerArgs<TInput> = {
  input: TInput;
  tx: Tx;
  ctx: ActionContext;
  /** The action's clock, fixed for the whole run. */
  now: Date;
  record: RecordEvent;
};

/**
 * Builds an application action: the only way data is written. Channels (web,
 * SMS) and the agent all call these, so every change is validated, wrapped in
 * a transaction, and recorded in the activity log with who did it and where
 * it came from.
 */
export function defineAction<TSchema extends z.ZodType, TResult>(config: {
  name: string;
  input: TSchema;
  handler: (args: ActionHandlerArgs<z.output<TSchema>>) => Promise<TResult>;
}) {
  return async function run(
    ctx: ActionContext,
    rawInput: z.input<TSchema>,
  ): Promise<TResult> {
    const parsed = config.input.safeParse(rawInput);
    if (!parsed.success) {
      throw new ActionError(
        "invalid_input",
        `${config.name}: ${z.prettifyError(parsed.error)}`,
      );
    }

    const now = ctx.now ?? new Date();
    return ctx.db.transaction(async (tx) => {
      const record: RecordEvent = async (event) => {
        await tx.insert(activityEvents).values({
          homeId: event.homeId ?? null,
          entityType: event.entityType,
          entityId: event.entityId,
          action: event.action,
          before: event.before ?? null,
          after: event.after ?? null,
          ...actorColumns(ctx.actor),
          ...sourceColumns(ctx.source),
          createdAt: now,
        });
      };

      return config.handler({ input: parsed.data, tx, ctx, now, record });
    });
  };
}
