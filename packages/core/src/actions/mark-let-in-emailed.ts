import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { firstRow } from "../db/rows";
import { invites } from "../db/schema";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";

export const markLetInEmailedInput = z.object({
  inviteId: z.uuid(),
});

/**
 * Records that a let-in email went out (D-072), so /ops/waitlist can say
 * "Emailed" rather than "Not emailed". The web app calls it after `letIn`,
 * once the mailer says the email was sent. Staff only.
 *
 * Only an emailed link that's still unused, and not already marked, changes;
 * anything else is left as it is and reported as not marked.
 */
export const markLetInEmailed = defineAction({
  name: "markLetInEmailed",
  input: markLetInEmailedInput,
  handler: async ({ input, tx, ctx, record, now }) => {
    if (ctx.actor.type !== "staff") {
      throw new ActionError(
        "invalid_input",
        "markLetInEmailed: only staff send let-in emails.",
      );
    }

    const invite = firstRow(
      await tx
        .update(invites)
        .set({ emailedAt: now })
        .where(
          and(
            eq(invites.id, input.inviteId),
            eq(invites.delivery, "email"),
            isNull(invites.usedAt),
            isNull(invites.emailedAt),
          ),
        )
        .returning({ id: invites.id }),
    );
    if (!invite) return { marked: false };

    await record({
      entityType: "invite",
      entityId: invite.id,
      action: "emailed",
      after: { emailedAt: now },
    });
    return { marked: true };
  },
});
