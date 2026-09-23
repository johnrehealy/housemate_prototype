import { desc, eq, or } from "drizzle-orm";
import type { Db } from "./client";
import { firstRow } from "./rows";
import { members, messages } from "./schema";

/** Anything that can run a select: the connection, or an open transaction. */
type Queryable = Pick<Db, "select">;

/**
 * Reads. Writes belong in application actions; these only look things up.
 * They run on the server connection, which bypasses row-level security, so
 * callers must already know the reader is allowed to see the rows.
 */

/**
 * The member record behind a signed-in Supabase account, or undefined when the
 * account has none. Sign-in uses this to find who is signing in.
 */
export async function getMemberByUserId(db: Queryable, userId: string) {
  return firstRow(
    await db
      .select({
        id: members.id,
        homeId: members.homeId,
        firstName: members.firstName,
        lastName: members.lastName,
        phone: members.phone,
        role: members.role,
        status: members.status,
      })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1),
  );
}

export type MemberSummary = NonNullable<
  Awaited<ReturnType<typeof getMemberByUserId>>
>;

/**
 * The latest texts to and from one phone number, oldest first, including texts
 * from numbers that aren't invited. For the SMS simulator only, which is why it
 * reads by phone rather than by home: it's how a developer watches both sides
 * of a simulated thread.
 */
export async function getSmsThread(db: Queryable, phone: string, limit = 50) {
  const latest = await db
    .select({
      id: messages.id,
      direction: messages.direction,
      body: messages.body,
      media: messages.media,
      deliveryStatus: messages.deliveryStatus,
      homeId: messages.homeId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(or(eq(messages.fromPhone, phone), eq(messages.toPhone, phone)))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return latest.reverse();
}
