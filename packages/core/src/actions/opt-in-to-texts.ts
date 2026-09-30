import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { firstRow } from "../db/rows";
import { members } from "../db/schema";
import { SMS_OPT_IN } from "../sms/opt-in";
import { defineAction } from "./define-action";

export const optInToTextsInput = z.object({
  memberId: z.uuid(),
  /**
   * The version of the wording the page showed, as the form sent it. Anything
   * but the current version is refused.
   */
  disclosureVersion: z
    .string()
    .refine((version) => version === SMS_OPT_IN.version, {
      message: "Not the wording the page shows now",
    }),
});

export type OptInToTextsInput = z.input<typeof optInToTextsInput>;

export type OptInToTextsResult =
  | { outcome: "opted_in"; consentAt: Date }
  | { outcome: "already_opted_in" }
  | { outcome: "not_eligible" };

/** Invited or active members, never staff or anyone removed. */
const canOptIn = (memberId: string) =>
  and(
    eq(members.id, memberId),
    eq(members.role, "member"),
    ne(members.status, "removed"),
  );

/**
 * Records a member's agreement to receive texts, from the optional box on the
 * welcome step after their first sign-in (D-067). It's the member's consent
 * that lets Housemate text them.
 *
 * The texted code has already proven the number, so the member is the actor.
 * Leaving the box unticked calls nothing and never withdraws consent; STOP
 * does that.
 *
 * Consent is set once: the update only matches a member who hasn't agreed
 * yet, so two submissions at the same moment record one agreement between
 * them.
 * The record keeps the number and the exact wording as well as the time,
 * because the privacy policy promises consent records outlive a closed
 * account, and the member row doesn't.
 */
export const optInToTexts = defineAction({
  name: "optInToTexts",
  input: optInToTextsInput,
  handler: async ({ input, tx, record, now }): Promise<OptInToTextsResult> => {
    const opted = firstRow(
      await tx
        .update(members)
        .set({ smsConsentAt: now })
        .where(and(canOptIn(input.memberId), isNull(members.smsConsentAt)))
        .returning({
          id: members.id,
          homeId: members.homeId,
          phone: members.phone,
        }),
    );

    if (!opted) {
      const existing = firstRow(
        await tx
          .select({ id: members.id })
          .from(members)
          .where(canOptIn(input.memberId))
          .limit(1),
      );
      return existing
        ? { outcome: "already_opted_in" }
        : { outcome: "not_eligible" };
    }

    await record({
      entityType: "member",
      entityId: opted.id,
      homeId: opted.homeId,
      action: "sms_opted_in",
      before: { smsConsentAt: null },
      after: {
        smsConsentAt: now,
        phone: opted.phone,
        method: "web_form",
        page: "/welcome",
        disclosureVersion: SMS_OPT_IN.version,
        label: SMS_OPT_IN.label,
        text: SMS_OPT_IN.text,
      },
    });

    return { outcome: "opted_in", consentAt: now };
  },
});
