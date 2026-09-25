import { z } from "zod";
import { waitlistSignups } from "../db/schema";
import { defineAction } from "./define-action";
import { emailAddress } from "./shared";

export const joinWaitlistInput = z.object({
  email: emailAddress,
});

/**
 * Puts an address on the landing page's waitlist (D-061).
 *
 * Joining twice is a no-op: the unique index decides, so a double submission
 * can't make a second row. The page says the same thing either way, which is
 * also what keeps it from being used to find out whether an address is already
 * on the list.
 *
 * Nobody here is a member yet, so there is no home and no person to attribute
 * it to: the landing page calls this as the system, from the web.
 */
export const joinWaitlist = defineAction({
  name: "joinWaitlist",
  input: joinWaitlistInput,
  handler: async ({ input, tx, record, now }) => {
    const [row] = await tx
      .insert(waitlistSignups)
      .values({ email: input.email, createdAt: now })
      .onConflictDoNothing()
      .returning();
    if (!row) return { joined: false as const };

    await record({
      entityType: "waitlist_signup",
      entityId: row.id,
      action: "joined",
    });

    // The stored address and time, not the input: the waitlist alert copies
    // exactly what the list holds.
    return {
      joined: true as const,
      signupId: row.id,
      email: row.email,
      joinedAt: row.createdAt,
    };
  },
});
