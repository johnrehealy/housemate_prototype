import { eq } from "drizzle-orm";
import type { ActionContext } from "../actions/context";
import { ActionError } from "../actions/errors";
import { sendInviteOnlyReply } from "../actions/send-invite-only-reply";
import { sendMessage } from "../actions/send-message";
import { firstRow } from "../db/rows";
import { members, messages } from "../db/schema";
import { inboundMessageJob } from "../queue/jobs";

/**
 * The temporary reply that stands in for the agent until Slice 1 (D-058's
 * approved copy). Local and staging only: the environment refuses
 * ACK_REPLY_ENABLED in production.
 */
export function acknowledgment(firstName: string): string {
  return `Hey ${firstName} - got it. This is an automatic reply while Housemate is being set up.`;
}

export type InboundJobResult =
  | {
      reply: "invite-only" | "acknowledgment";
      messageId: string;
      duplicate: boolean;
    }
  | { reply: "none"; reason: "acknowledgment-off" | "member-removed" };

/**
 * Handles one inbound_messages job. Safe to run more than once for the same
 * job, as a retry after a crash does: each reply has an idempotency key, so a
 * second run finds the reply already saved and sends nothing (D-058).
 */
export async function handleInboundMessageJob(
  ctx: ActionContext,
  payload: unknown,
  options: { ackReplyEnabled: boolean },
): Promise<InboundJobResult> {
  const { messageId } = inboundMessageJob.parse(payload);

  // Reloaded rather than trusted from the payload: the database is the
  // source of truth, and the sender may have been invited or removed since.
  const text = await ctx.db.transaction(async (tx) =>
    firstRow(
      await tx
        .select({
          id: messages.id,
          homeId: messages.homeId,
          memberId: messages.memberId,
          firstName: members.firstName,
          memberStatus: members.status,
        })
        .from(messages)
        .leftJoin(members, eq(messages.memberId, members.id))
        .where(eq(messages.id, messageId))
        .limit(1),
    ),
  );
  if (!text) {
    throw new ActionError("not_found", `No inbound text ${messageId}.`);
  }

  // Each reply's history points at the text it answers.
  const replyCtx: ActionContext = {
    ...ctx,
    actor: { type: "system" },
    source: { type: "sms", messageId: text.id },
  };

  if (!text.homeId || !text.memberId) {
    const sent = await sendInviteOnlyReply(replyCtx, {
      inboundMessageId: text.id,
    });
    return {
      reply: "invite-only",
      messageId: sent.messageId,
      duplicate: sent.duplicate,
    };
  }

  if (text.memberStatus === "removed") {
    return { reply: "none", reason: "member-removed" };
  }
  if (!options.ackReplyEnabled) {
    return { reply: "none", reason: "acknowledgment-off" };
  }

  const sent = await sendMessage(replyCtx, {
    homeId: text.homeId,
    memberId: text.memberId,
    kind: "reply",
    author: "system",
    body: acknowledgment(text.firstName ?? "there"),
    idempotencyKey: `ack:${text.id}`,
  });
  return {
    reply: "acknowledgment",
    messageId: sent.messageId,
    duplicate: sent.duplicate,
  };
}
