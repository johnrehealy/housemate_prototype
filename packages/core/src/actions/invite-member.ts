import { z } from "zod";
import { expectRow } from "../db/rows";
import { homes, members } from "../db/schema";
import type { ActionContext } from "./context";
import { mapDbError } from "./db-errors";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";
import { e164Phone, ianaTimezone } from "./shared";

export const inviteMemberInput = z.object({
  phone: e164Phone,
  firstName: z.string().min(1),
  lastName: z.string().min(1).optional(),
  role: z.enum(["member", "staff"]).default("member"),
  /** A new home for this member. Use `homeId` to add them to an existing one. */
  home: z
    .object({
      name: z.string().min(1),
      address: z.string().min(1),
      timezone: ianaTimezone,
    })
    .optional(),
  homeId: z.uuid().optional(),
});

export type InviteMemberInput = z.input<typeof inviteMemberInput>;

const saveInvitedMember = defineAction({
  name: "inviteMember",
  input: inviteMemberInput.extend({ userId: z.uuid() }),
  handler: async ({ input, tx, record, now }) => {
    let homeId = input.homeId ?? null;

    if (input.home) {
      const home = expectRow(
        await tx.insert(homes).values(input.home).returning(),
        "the new home",
      );
      homeId = home.id;
      await record({
        entityType: "home",
        entityId: home.id,
        homeId: home.id,
        action: "created",
        after: { name: home.name, timezone: home.timezone },
      });
    }

    const member = expectRow(
      await tx
        .insert(members)
        .values({
          userId: input.userId,
          homeId,
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          role: input.role,
          status: "invited",
          createdAt: now,
        })
        .returning(),
      "the new member",
    );

    await record({
      entityType: "member",
      entityId: member.id,
      homeId,
      action: "invited",
      after: {
        phone: member.phone,
        firstName: member.firstName,
        role: member.role,
      },
    });

    return { memberId: member.id, homeId, userId: input.userId };
  },
});

/**
 * Invites a member: creates the account they sign in with, then their member
 * row. The account is created first because it needs a network call, and is
 * removed again if saving the member fails (for example at the pilot cap).
 */
export async function inviteMember(
  ctx: ActionContext,
  input: InviteMemberInput,
) {
  const parsed = inviteMemberInput.safeParse(input);
  if (!parsed.success) {
    throw new ActionError(
      "invalid_input",
      `inviteMember: ${z.prettifyError(parsed.error)}`,
    );
  }
  const invite = parsed.data;

  if (invite.role === "member" && !invite.home === !invite.homeId) {
    throw new ActionError(
      "invalid_input",
      "inviteMember: give either a new home or an existing homeId.",
    );
  }
  if (invite.role === "staff" && (invite.home || invite.homeId)) {
    throw new ActionError(
      "invalid_input",
      "inviteMember: staff don't belong to a home.",
    );
  }

  let userId: string;
  try {
    ({ userId } = await ctx.services.auth.createUser({ phone: invite.phone }));
  } catch (error) {
    // A number that already has an account means the member is already invited.
    throw mapDbError(error);
  }

  try {
    return await saveInvitedMember(ctx, { ...invite, userId });
  } catch (error) {
    // The member wasn't saved, so the sign-in account shouldn't linger.
    await ctx.services.auth.deleteUser(userId).catch(() => {});
    throw mapDbError(error);
  }
}
