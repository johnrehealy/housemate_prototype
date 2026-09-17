import { eq } from "drizzle-orm";
import { z } from "zod";
import { firstRow } from "../db/rows";
import { members } from "../db/schema";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";

export const activateMemberInput = z.object({
  memberId: z.uuid(),
});

export type ActivateMemberInput = z.input<typeof activateMemberInput>;

/**
 * Turns an invited member into an active one. Signing in is what activates a
 * member: the invite created their account, and proving the phone number is
 * what makes them real.
 *
 * This runs on every sign-in, so an already-active member is left untouched
 * and writes no event. Otherwise the activity log would fill with one entry
 * per sign-in and say nothing.
 */
export const activateMember = defineAction({
  name: "activateMember",
  input: activateMemberInput,
  handler: async ({ input, tx, record }) => {
    const member = firstRow(
      await tx
        .select({
          id: members.id,
          homeId: members.homeId,
          status: members.status,
        })
        .from(members)
        .where(eq(members.id, input.memberId))
        .limit(1),
    );

    if (!member) {
      throw new ActionError("not_found", "activateMember: no such member.");
    }
    if (member.status === "removed") {
      throw new ActionError(
        "conflict",
        "activateMember: that member was removed.",
      );
    }
    if (member.status === "active") {
      return { memberId: member.id, homeId: member.homeId, activated: false };
    }

    // Invited and active members both count toward the pilot cap, so this
    // transition can't push a home over it.
    await tx
      .update(members)
      .set({ status: "active" })
      .where(eq(members.id, member.id));

    await record({
      entityType: "member",
      entityId: member.id,
      homeId: member.homeId,
      action: "activated",
      before: { status: member.status },
      after: { status: "active" },
    });

    return { memberId: member.id, homeId: member.homeId, activated: true };
  },
});
