import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { PILOT_MEMBER_CAP } from "../config";
import { expectRow, firstRow } from "../db/rows";
import { countPilotMembers, findMemberClash } from "../db/queries";
import { invites, waitlistSignups } from "../db/schema";
import { hashInviteToken } from "../invite-token";
import { TERMS_VERSION } from "../legal";
import { SMS_OPT_IN } from "../sms/opt-in";
import { defineAction } from "./define-action";
import { issueInvite } from "./issue-invite";
import {
  e164Phone,
  emailAddress,
  homeAddressInput,
  ianaTimezone,
  optionalText,
} from "./shared";

export const joinWaitlistInput = z
  .object({
    email: emailAddress,
    firstName: z.string().trim().min(1).max(100),
    lastName: optionalText(100),
    /** Optional (D-074). Without it, codes come by email and no texts are sent. */
    phone: e164Phone.optional(),
    /** G3's "Text me about my home" box. */
    textsAgreed: z.boolean(),
    /** The wording the box showed, when it was ticked. */
    textsVersion: z.string().optional(),
    /** The Terms the page linked to. Anything but the current version is refused. */
    termsVersion: z.string().refine((version) => version === TERMS_VERSION, {
      message: "Not the Terms the page links to now",
    }),
    address: homeAddressInput,
    timezone: ianaTimezone,
    /**
     * The let-in link the page was opened from, if any. While it's still open
     * for this entry it's kept, so the code confirms against the emailed link,
     * which proves the email (D-073), rather than a new one handed to the page.
     */
    token: z.string().min(1).max(200).optional(),
    /**
     * The entry this page made a moment ago, when the person has gone back
     * from W1 to fix their email. That entry takes the new email rather than
     * staying behind under the mistyped one with their details on it.
     */
    replaces: z.uuid().optional(),
  })
  .refine((input) => !input.textsAgreed || input.phone, {
    message: "Agreeing to texts needs a mobile number",
    path: ["textsAgreed"],
  })
  .refine(
    (input) => !input.textsAgreed || input.textsVersion === SMS_OPT_IN.version,
    {
      message: "Not the wording the page shows now",
      path: ["textsVersion"],
    },
  );

export type JoinWaitlistInput = z.input<typeof joinWaitlistInput>;

/** How long after saving an entry the page can still change its email. */
const REPLACE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Saves what someone gave on Get started to the waitlist (D-072), and lets
 * them straight on when they're on the alpha list and the pilot has room.
 *
 * The row is keyed by email, so going through Get started again updates the
 * same row: a let-in link, or an entry from the old email bar, gets its
 * details filled in. Ticking the texts box stores the wording's version and
 * the time on the row; leaving it unticked clears both (D-074). Nobody is a
 * member yet, so the website calls this as the system.
 *
 * - **An email or number that's already a member's** saves nothing and says
 *   which, so the page can offer sign-in.
 * - **On the alpha list with room:** a single-use link for the page, and the
 *   channel its code goes to: a text when there's a number, an email when not.
 *   The let-in link the page came from is kept if it's still open.
 * - **Otherwise:** waitlisted. `isNew` says whether the row was just made, so
 *   the website alerts the team once per person.
 *
 * `replaces` fixes an email typed wrong. It's honoured only for an entry
 * nobody has let in yet, saved within the last hour, under another email;
 * otherwise it's ignored. That entry takes the new email and details, so the
 * person stays one entry and the team isn't alerted twice. If the new email
 * already has an entry, that one is updated and the mistyped one deleted, so
 * no copy of their details stays under an address that isn't theirs.
 *
 * Nothing about the person goes into the activity log: their address, number
 * and name are on the row, which only staff can read.
 */
export const joinWaitlist = defineAction({
  name: "joinWaitlist",
  input: joinWaitlistInput,
  handler: async ({ input, tx, record, now }) => {
    const clash = await findMemberClash(tx, {
      email: input.email,
      phone: input.phone,
    });
    if (clash.email)
      return { status: "member" as const, field: "email" as const };
    if (clash.phone)
      return { status: "member" as const, field: "phone" as const };

    const details = {
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      addressLine1: input.address.line1,
      addressUnit: input.address.unit ?? null,
      city: input.address.city,
      state: input.address.state,
      zip: input.address.zip,
      placeId: input.address.placeId ?? null,
      timezone: input.timezone,
      termsVersion: input.termsVersion,
      smsConsentVersion: input.textsAgreed ? SMS_OPT_IN.version : null,
      smsConsentAt: input.textsAgreed ? now : null,
      updatedAt: now,
    };

    const returned = {
      id: waitlistSignups.id,
      email: waitlistSignups.email,
      createdAt: waitlistSignups.createdAt,
      approvedBy: waitlistSignups.approvedBy,
    };
    const summary = {
      termsVersion: input.termsVersion,
      hasPhone: Boolean(input.phone),
      smsConsentVersion: details.smsConsentVersion,
    };

    const mistyped =
      input.replaces &&
      firstRow(
        await tx
          .select({ id: waitlistSignups.id })
          .from(waitlistSignups)
          .where(
            and(
              eq(waitlistSignups.id, input.replaces),
              ne(waitlistSignups.email, input.email),
              isNull(waitlistSignups.approvedAt),
              gt(
                waitlistSignups.updatedAt,
                new Date(now.getTime() - REPLACE_WINDOW_MS),
              ),
            ),
          )
          .limit(1)
          .for("update"),
      );
    const taken =
      mistyped &&
      firstRow(
        await tx
          .select({ id: waitlistSignups.id })
          .from(waitlistSignups)
          .where(eq(waitlistSignups.email, input.email))
          .limit(1),
      );

    let row;
    if (mistyped && !taken) {
      row = {
        ...expectRow(
          await tx
            .update(waitlistSignups)
            .set({ email: input.email, ...details })
            .where(eq(waitlistSignups.id, mistyped.id))
            .returning(returned),
          "the waitlist entry",
        ),
        isNew: false,
      };
      // No email in the event: the row holds it, and only staff can read it.
      await record({
        entityType: "waitlist_signup",
        entityId: row.id,
        action: "email_changed",
        after: summary,
      });
    } else {
      if (mistyped) {
        await tx
          .delete(waitlistSignups)
          .where(eq(waitlistSignups.id, mistyped.id));
        await record({
          entityType: "waitlist_signup",
          entityId: mistyped.id,
          action: "removed",
          after: { reason: "email_changed" },
        });
      }
      row = expectRow(
        await tx
          .insert(waitlistSignups)
          .values({ email: input.email, ...details, createdAt: now })
          .onConflictDoUpdate({ target: waitlistSignups.email, set: details })
          .returning({
            ...returned,
            // Postgres sets xmax only on a row an upsert updated.
            isNew: sql<boolean>`(xmax = 0)`,
          }),
        "the waitlist entry",
      );
      await record({
        entityType: "waitlist_signup",
        entityId: row.id,
        action: row.isNew ? "joined" : "details_updated",
        after: summary,
      });
    }

    if (row.approvedBy && (await countPilotMembers(tx)) < PILOT_MEMBER_CAP) {
      const channel = input.phone ? ("sms" as const) : ("email" as const);
      const kept =
        input.token &&
        firstRow(
          await tx
            .select({ id: invites.id })
            .from(invites)
            .where(
              and(
                eq(invites.tokenHash, hashInviteToken(input.token)),
                eq(invites.waitlistSignupId, row.id),
                isNull(invites.usedAt),
                gt(invites.expiresAt, now),
              ),
            )
            .limit(1),
        );
      if (kept && input.token) {
        return { status: "continue" as const, token: input.token, channel };
      }

      const invite = await issueInvite(
        { tx, record, now },
        {
          waitlistSignupId: row.id,
          email: row.email,
          createdBy: row.approvedBy,
          delivery: "page",
        },
      );
      return { status: "continue" as const, token: invite.token, channel };
    }

    return {
      status: "waitlisted" as const,
      isNew: row.isNew,
      signupId: row.id,
      email: row.email,
      joinedAt: row.createdAt,
    };
  },
});
