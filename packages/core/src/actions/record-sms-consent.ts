import { eq } from "drizzle-orm";
import type { Tx } from "../db/client";
import { members } from "../db/schema";
import { SMS_OPT_IN } from "../sms/opt-in";
import type { Actor } from "./context";
import type { RecordEvent } from "./define-action";

/**
 * Records a member's agreement to receive texts, inside the action that
 * creates their account. They agreed on Get started's G3 box (D-074) before
 * the account existed, so the record carries that moment as `agreedAt`, and
 * the texted code has just proven the number.
 *
 * The record keeps the number and the exact wording as well as the time,
 * because the privacy policy promises consent records outlive a closed
 * account, and the member row doesn't. Leaving the box unticked calls nothing;
 * STOP is what withdraws consent.
 */
export async function recordSmsConsent(
  { tx, record, now }: { tx: Tx; record: RecordEvent; now: Date },
  input: {
    member: { id: string; homeId: string | null; phone: string };
    actor: Actor;
    /** The page the box was on, e.g. "/get-started". */
    page: string;
    /** When they ticked the box. */
    agreedAt: Date;
  },
): Promise<void> {
  await tx
    .update(members)
    .set({ smsConsentAt: input.agreedAt })
    .where(eq(members.id, input.member.id));

  await record({
    entityType: "member",
    entityId: input.member.id,
    homeId: input.member.homeId,
    actor: input.actor,
    action: "sms_opted_in",
    before: { smsConsentAt: null },
    after: {
      smsConsentAt: input.agreedAt,
      recordedAt: now,
      phone: input.member.phone,
      method: "web_form",
      page: input.page,
      disclosureVersion: SMS_OPT_IN.version,
      label: SMS_OPT_IN.label,
      smallPrint: SMS_OPT_IN.smallPrint,
    },
  });
}
