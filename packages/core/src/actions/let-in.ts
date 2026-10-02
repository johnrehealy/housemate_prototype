import { eq } from "drizzle-orm";
import { z } from "zod";
import { PILOT_MEMBER_CAP } from "../config";
import { countPilotMembers, findMemberClash } from "../db/queries";
import { expectRow, firstRow } from "../db/rows";
import { waitlistSignups } from "../db/schema";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";
import { issueInvite } from "./issue-invite";
import { emailAddress } from "./shared";

export const letInInput = z.object({
  email: emailAddress,
});

export type LetInInput = z.input<typeof letInInput>;

/**
 * Lets someone off the waitlist (D-072): puts their email on the alpha list
 * and makes the single-use Get started link the web app then emails them.
 * Staff only, from /ops/waitlist.
 *
 * The email needn't be on the waitlist yet; it's added. Letting someone in
 * again ("Send again") keeps when they were first let in and makes a new link,
 * which replaces the last. It's refused for an email that's already a
 * member's, and while the pilot has no places left, so nobody is told a spot
 * opened up when there isn't one.
 *
 * The token is returned once, for the email; neither it nor the address goes
 * into the activity log. Once the email has gone, `markLetInEmailed` says so.
 */
export const letIn = defineAction({
  name: "letIn",
  input: letInInput,
  handler: async ({ input, tx, ctx, record, now }) => {
    if (ctx.actor.type !== "staff") {
      throw new ActionError(
        "invalid_input",
        "letIn: only staff let people in.",
      );
    }
    const staffId = ctx.actor.id;

    if ((await findMemberClash(tx, { email: input.email })).email) {
      throw new ActionError(
        "conflict",
        "letIn: that email already has a Housemate account.",
      );
    }
    if ((await countPilotMembers(tx)) >= PILOT_MEMBER_CAP) {
      throw new ActionError(
        "member_cap",
        "The pilot is limited to 10 members.",
      );
    }

    const existing = firstRow(
      await tx
        .select({
          id: waitlistSignups.id,
          firstName: waitlistSignups.firstName,
          approvedAt: waitlistSignups.approvedAt,
        })
        .from(waitlistSignups)
        .where(eq(waitlistSignups.email, input.email))
        .limit(1)
        .for("update"),
    );

    let signup: { id: string; firstName: string | null };
    if (!existing) {
      signup = expectRow(
        await tx
          .insert(waitlistSignups)
          .values({
            email: input.email,
            approvedAt: now,
            approvedBy: staffId,
            createdAt: now,
            updatedAt: now,
          })
          .returning({
            id: waitlistSignups.id,
            firstName: waitlistSignups.firstName,
          }),
        "the waitlist entry",
      );
    } else {
      signup = existing;
      if (!existing.approvedAt) {
        await tx
          .update(waitlistSignups)
          .set({ approvedAt: now, approvedBy: staffId, updatedAt: now })
          .where(eq(waitlistSignups.id, existing.id));
      }
    }

    const newlyApproved = !existing?.approvedAt;
    if (newlyApproved) {
      await record({
        entityType: "waitlist_signup",
        entityId: signup.id,
        action: "approved",
        after: { addedToWaitlist: !existing },
      });
    }

    const invite = await issueInvite(
      { tx, record, now },
      {
        waitlistSignupId: signup.id,
        email: input.email,
        createdBy: staffId,
        delivery: "email",
      },
    );

    return {
      signupId: signup.id,
      inviteId: invite.inviteId,
      email: input.email,
      firstName: signup.firstName ?? undefined,
      token: invite.token,
      expiresAt: invite.expiresAt,
      newlyApproved,
    };
  },
});
