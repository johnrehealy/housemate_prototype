import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { firstRow } from "./rows";
import { members } from "./schema";

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
