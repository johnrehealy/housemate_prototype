import { eq } from "drizzle-orm";
import { z } from "zod";
import { alerts } from "../db/schema";
import type { ActionContext } from "./context";
import { defineAction } from "./define-action";
import { deliver, insertOutbound } from "./outbound";
import { e164Phone } from "./shared";

export const raiseAlertInput = z.object({
  kind: z.enum([
    "member_over_budget",
    "pilot_over_budget",
    "worker_error",
    "send_stuck",
  ]),
  memberId: z.uuid().nullable().default(null),
  /** Makes an alert fire once: the same key never alerts twice (D-042). */
  dedupeKey: z.string().min(1),
  detail: z.record(z.string(), z.unknown()).default({}),
  /** What the team is texted. */
  text: z.string().min(1),
  /** The team's numbers, from TEAM_ALERT_PHONES. */
  teamPhones: z.array(e164Phone).default([]),
});

export type RaiseAlertInput = z.input<typeof raiseAlertInput>;

/**
 * Raises the alert and saves a text for each team number, all in one
 * transaction. A repeat of the same key writes nothing at all.
 */
const queueAlert = defineAction({
  name: "raiseAlert",
  input: raiseAlertInput,
  handler: async ({ input, tx, record, now }) => {
    const [alert] = await tx
      .insert(alerts)
      .values({
        kind: input.kind,
        memberId: input.memberId,
        dedupeKey: input.dedupeKey,
        detail: input.detail,
        createdAt: now,
      })
      .onConflictDoNothing({ target: alerts.dedupeKey })
      .returning();
    if (!alert) return { raised: false as const };

    // The team isn't a member, so these texts have no home: like the
    // invite-only reply, they're staff-only under row-level security.
    const texts = [];
    for (const phone of input.teamPhones) {
      const saved = await insertOutbound(tx, {
        homeId: null,
        memberId: null,
        direction: "outbound",
        channel: "sms",
        author: "system",
        outboundKind: "proactive",
        body: input.text,
        toPhone: phone,
        deliveryStatus: "queued",
        idempotencyKey: `alert:${input.dedupeKey}:${phone}`,
        createdAt: now,
      });
      if (saved.inserted) {
        texts.push({
          messageId: saved.row.id,
          to: phone,
          body: input.text,
        });
      }
    }

    await record({
      entityType: "alert",
      entityId: alert.id,
      homeId: null,
      action: "raised",
      after: {
        kind: alert.kind,
        dedupeKey: alert.dedupeKey,
        detail: alert.detail,
        notified: texts.length,
      },
    });

    return { raised: true as const, alertId: alert.id, texts };
  },
});

/** Marks the alert as one the team has been texted about. */
const markNotified = defineAction({
  name: "markAlertNotified",
  input: z.object({ alertId: z.uuid() }),
  handler: async ({ input, tx, now }) => {
    await tx
      .update(alerts)
      .set({ notifiedAt: now })
      .where(eq(alerts.id, input.alertId));
  },
});

/**
 * Tells the team something needs attention (D-042): one alert per dedupe key,
 * ever, and one text per team number.
 *
 * Quiet hours don't apply. These go to the team's own phones, and a failure at
 * 3 AM is still worth knowing about; a member is never texted this way.
 */
export async function raiseAlert(
  ctx: ActionContext,
  input: RaiseAlertInput,
): Promise<{ raised: boolean; alertId?: string; notified: number }> {
  const alert = await queueAlert(ctx, input);
  if (!alert.raised) return { raised: false, notified: 0 };

  let notified = 0;
  for (const text of alert.texts) {
    // One unreachable number mustn't stop the others. The text stays saved as
    // failed, and the alert is still raised.
    try {
      await deliver(ctx, text);
      notified += 1;
    } catch {
      // deliver already recorded the failure on the text.
    }
  }
  if (notified > 0) await markNotified(ctx, { alertId: alert.alertId });

  return { raised: true, alertId: alert.alertId, notified };
}
