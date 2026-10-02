import { and, eq, isNull } from "drizzle-orm";
import { INVITE_LINK_DAYS } from "../config";
import type { Tx } from "../db/client";
import { expectRow } from "../db/rows";
import { invites } from "../db/schema";
import { hashInviteToken, newInviteToken } from "../invite-token";
import type { RecordEvent } from "./define-action";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Makes the single-use link that lets someone on the alpha list set up their
 * account (D-072), inside the action that decided they may. Letting someone in
 * emails it; an alpha-list visitor on the website gets it handed to the page.
 *
 * The token is returned once and never stored: the table keeps its hash, so
 * nobody reading it can open the link. A new link replaces any unused earlier
 * one for the same waitlist entry, so only the newest works.
 *
 * Neither the token nor the address goes into the activity log.
 */
export async function issueInvite(
  { tx, record, now }: { tx: Tx; record: RecordEvent; now: Date },
  input: {
    waitlistSignupId: string;
    email: string;
    /** The staff member who put them on the alpha list. */
    createdBy: string;
    delivery: "email" | "page";
  },
): Promise<{ inviteId: string; token: string; expiresAt: Date }> {
  const replaced = await tx
    .delete(invites)
    .where(
      and(
        eq(invites.waitlistSignupId, input.waitlistSignupId),
        isNull(invites.usedAt),
      ),
    )
    .returning({ id: invites.id });

  const token = newInviteToken();
  const invite = expectRow(
    await tx
      .insert(invites)
      .values({
        tokenHash: hashInviteToken(token),
        delivery: input.delivery,
        email: input.email,
        waitlistSignupId: input.waitlistSignupId,
        createdBy: input.createdBy,
        createdAt: now,
        expiresAt: new Date(now.getTime() + INVITE_LINK_DAYS * DAY_MS),
      })
      .returning({ id: invites.id, expiresAt: invites.expiresAt }),
    "the new invite",
  );

  await record({
    entityType: "invite",
    entityId: invite.id,
    action: "created",
    after: {
      waitlistSignupId: input.waitlistSignupId,
      delivery: input.delivery,
      expiresAt: invite.expiresAt,
      replaced: replaced.map((row) => row.id),
    },
  });

  return { inviteId: invite.id, token, expiresAt: invite.expiresAt };
}
