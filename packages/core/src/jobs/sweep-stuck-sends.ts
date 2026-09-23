import { and, eq, lt } from "drizzle-orm";
import type { ActionContext } from "../actions/context";
import { raiseAlert } from "../actions/raise-alert";
import { formatUsPhone } from "../phone";
import { messages } from "../db/schema";

/** How long a text may sit unsent before the team hears about it. */
export const STUCK_AFTER_MINUTES = 15;

/** At most this many alerts per sweep, so one bad spell can't flood the team. */
const MAX_PER_SWEEP = 10;

/** What the team is told about a text that never came back. */
export function stuckSendText(
  messageId: string,
  toPhone: string | null,
  ageMinutes: number,
): string {
  const who = toPhone ? `, to ${formatUsPhone(toPhone)}` : "";
  return `Housemate alert: a text from ${ageMinutes} minutes ago still has no delivery result. Message ${messageId.slice(0, 6)}${who}. It may not have gone out.`;
}

/**
 * Finds texts that were saved but never got a result from the provider — the
 * gap a crash between saving and sending leaves — and tells the team once per
 * text. Nothing is resent: a duplicate text is worse than a gap (D-060).
 */
export async function sweepStuckSends(
  ctx: ActionContext,
  options: { teamPhones?: string[] } = {},
): Promise<{ found: number; raised: number }> {
  const now = ctx.now ?? new Date();
  const cutoff = new Date(now.getTime() - STUCK_AFTER_MINUTES * 60_000);

  const stuck = await ctx.db.transaction(async (tx) =>
    tx
      .select({
        id: messages.id,
        toPhone: messages.toPhone,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(messages.direction, "outbound"),
          eq(messages.deliveryStatus, "queued"),
          lt(messages.createdAt, cutoff),
        ),
      )
      .limit(MAX_PER_SWEEP),
  );

  let raised = 0;
  for (const text of stuck) {
    const ageMinutes = Math.floor(
      (now.getTime() - text.createdAt.getTime()) / 60_000,
    );
    const alert = await raiseAlert(ctx, {
      kind: "send_stuck",
      dedupeKey: `stuck-send:${text.id}`,
      detail: { messageId: text.id, ageMinutes },
      text: stuckSendText(text.id, text.toPhone, ageMinutes),
      teamPhones: options.teamPhones ?? [],
    });
    if (alert.raised) raised += 1;
  }

  return { found: stuck.length, raised };
}
