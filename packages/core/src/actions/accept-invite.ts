import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { formatAddress } from "../address/format";
import { expectRow, firstRow } from "../db/rows";
import { homes, invites, members, waitlistSignups } from "../db/schema";
import { hashInviteToken } from "../invite-token";
import { TERMS_VERSION } from "../legal";
import { SMS_OPT_IN } from "../sms/opt-in";
import type { ActionContext, Actor } from "./context";
import { mapDbError } from "./db-errors";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";
import { recordSmsConsent } from "./record-sms-consent";
import { e164Phone, emailAddress } from "./shared";

export const acceptInviteInput = z.object({
  /** The token from the link, as the page received it. */
  token: z.string().min(1).max(200),
  /** The sign-in account the code just signed in. */
  userId: z.uuid(),
  /** What the code proved: the number it was texted to, or the address it was emailed to. */
  proof: z.discriminatedUnion("channel", [
    z.object({ channel: z.literal("sms"), phone: e164Phone }),
    z.object({ channel: z.literal("email"), email: emailAddress }),
  ]),
});

export type AcceptInviteInput = z.input<typeof acceptInviteInput>;

const saveAcceptedInvite = defineAction({
  name: "acceptInvite",
  input: acceptInviteInput,
  handler: async ({ input, tx, record, now }) => {
    // Locked, so two tabs finishing the same link can't both use it.
    const invite = firstRow(
      await tx
        .select({
          id: invites.id,
          email: invites.email,
          delivery: invites.delivery,
          waitlistSignupId: invites.waitlistSignupId,
          expiresAt: invites.expiresAt,
          usedAt: invites.usedAt,
        })
        .from(invites)
        .where(eq(invites.tokenHash, hashInviteToken(input.token)))
        .limit(1)
        .for("update"),
    );
    if (!invite) {
      throw new ActionError("not_found", "acceptInvite: no such invite link.");
    }
    if (invite.usedAt || invite.expiresAt <= now) {
      throw new ActionError(
        "conflict",
        "acceptInvite: that link has been used or has expired.",
      );
    }

    const signup = invite.waitlistSignupId
      ? firstRow(
          await tx
            .select()
            .from(waitlistSignups)
            .where(eq(waitlistSignups.id, invite.waitlistSignupId))
            .limit(1)
            .for("update"),
        )
      : undefined;
    const details = signup && completeDetails(signup);
    if (!details) {
      throw new ActionError(
        "stale_details",
        "acceptInvite: the saved details are missing or out of date.",
      );
    }

    // The code must have gone where the saved details say it goes, so a
    // change made on G3 in another tab can't be confirmed by an older code.
    const proven =
      input.proof.channel === "sms"
        ? details.phone === input.proof.phone
        : details.phone === null && details.email === input.proof.email;
    if (!proven) {
      throw new ActionError(
        "stale_details",
        "acceptInvite: the code wasn't sent to the saved number or email.",
      );
    }

    const home = expectRow(
      await tx
        .insert(homes)
        .values({
          name: `${details.firstName}'s home`,
          address: formatAddress(details.address),
          placeId: details.address.placeId,
          timezone: details.timezone,
          createdAt: now,
        })
        .returning({
          id: homes.id,
          name: homes.name,
          timezone: homes.timezone,
        }),
      "the new home",
    );

    const member = expectRow(
      await tx
        .insert(members)
        .values({
          userId: input.userId,
          homeId: home.id,
          phone: details.phone,
          email: details.email,
          firstName: details.firstName,
          lastName: details.lastName,
          role: "member",
          status: "active",
          createdAt: now,
        })
        .returning({ id: members.id }),
      "the new member",
    );

    // The member did all of this, though they only exist from here on.
    const actor: Actor = { type: "member", id: member.id };

    // The address stays out of the log: it's on the home, where access is
    // limited to the home's members.
    await record({
      entityType: "home",
      entityId: home.id,
      homeId: home.id,
      actor,
      action: "created",
      after: { name: home.name, timezone: home.timezone },
    });
    await record({
      entityType: "member",
      entityId: member.id,
      homeId: home.id,
      actor,
      action: "joined",
      after: {
        phone: details.phone,
        firstName: details.firstName,
        role: "member",
        status: "active",
        termsVersion: details.termsVersion,
        signedInBy: input.proof.channel,
      },
    });

    // Agreed on G3, before the account existed: recorded at that time.
    if (details.phone && details.smsConsentAt) {
      await recordSmsConsent(
        { tx, record, now },
        {
          member: { id: member.id, homeId: home.id, phone: details.phone },
          actor,
          page: "/get-started",
          agreedAt: details.smsConsentAt,
        },
      );
    }

    await tx
      .update(invites)
      .set({ usedAt: now, memberId: member.id })
      .where(eq(invites.id, invite.id));
    // Any other link for this address is now pointless, and the address is
    // off the waitlist: it belongs to a member, who holds its details now.
    await tx
      .delete(invites)
      .where(
        and(
          eq(invites.email, invite.email),
          isNull(invites.usedAt),
          ne(invites.id, invite.id),
        ),
      );
    const leftWaitlist = await tx
      .delete(waitlistSignups)
      .where(eq(waitlistSignups.email, invite.email))
      .returning({ id: waitlistSignups.id });

    await record({
      entityType: "invite",
      entityId: invite.id,
      homeId: home.id,
      actor,
      action: "used",
      after: {
        memberId: member.id,
        leftWaitlist: leftWaitlist.map((row) => row.id),
      },
    });

    return {
      memberId: member.id,
      homeId: home.id,
      email: details.email,
      phone: details.phone,
      firstName: details.firstName,
      /**
       * Whether the address is proven: the link was emailed to it, or the code
       * was. Only then may the sign-in account carry it (D-073).
       */
      emailProven:
        invite.delivery === "email" || input.proof.channel === "email",
    };
  },
});

/**
 * The waitlist row's details, when everything an account needs is there and
 * was agreed under the current Terms and texts wording. Otherwise undefined,
 * and the person goes through Get started again.
 */
export function completeDetails(row: typeof waitlistSignups.$inferSelect) {
  const {
    firstName,
    addressLine1,
    city,
    state,
    zip,
    timezone,
    termsVersion,
    smsConsentVersion,
  } = row;
  if (!firstName || !addressLine1 || !city || !state || !zip || !timezone) {
    return undefined;
  }
  if (termsVersion !== TERMS_VERSION) return undefined;
  if (smsConsentVersion !== null && smsConsentVersion !== SMS_OPT_IN.version) {
    return undefined;
  }
  return {
    email: row.email,
    firstName,
    lastName: row.lastName,
    phone: row.phone,
    address: {
      line1: addressLine1,
      unit: row.addressUnit ?? undefined,
      city,
      state,
      zip,
      placeId: row.placeId,
    },
    timezone,
    termsVersion,
    smsConsentAt: row.smsConsentAt,
  };
}

/**
 * Creates a member from a Get started link once their code is confirmed
 * (D-072, D-073): their home, their active member record, and their consent to
 * texts if they ticked G3's box. Everything comes from their waitlist row, the
 * one saved copy of what they gave, which is then deleted. One transaction, so
 * an account is either complete or not there at all.
 *
 * The member is the actor for everything recorded, since they're the one who
 * did it.
 */
export async function acceptInvite(
  ctx: ActionContext,
  input: AcceptInviteInput,
) {
  try {
    return await saveAcceptedInvite(ctx, input);
  } catch (error) {
    // A full pilot, or a number or email that's already a member's.
    throw mapDbError(error);
  }
}
