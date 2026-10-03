import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { PILOT_MEMBER_CAP } from "../config";
import { hashInviteToken } from "../invite-token";
import type { Db } from "./client";
import { firstRow } from "./rows";
import { invites, members, waitlistSignups } from "./schema";

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
 * The unused, unexpired invite a link's token opens, with the waitlist row it
 * belongs to, or undefined. Get started shows the same page for a link that
 * never existed, was used, or expired, so callers can't tell which and neither
 * can anyone guessing links.
 *
 * The row is what Get started fills its steps from, so only the link's holder
 * sees it.
 */
export async function getOpenInvite(
  db: Queryable,
  token: string,
  now: Date = new Date(),
) {
  return firstRow(
    await db
      .select({
        inviteId: invites.id,
        email: invites.email,
        delivery: invites.delivery,
        expiresAt: invites.expiresAt,
        signup: waitlistSignups,
      })
      .from(invites)
      .leftJoin(
        waitlistSignups,
        eq(waitlistSignups.id, invites.waitlistSignupId),
      )
      .where(
        and(
          eq(invites.tokenHash, hashInviteToken(token)),
          isNull(invites.usedAt),
          gt(invites.expiresAt, now),
        ),
      )
      .limit(1),
  );
}

export type OpenInvite = NonNullable<Awaited<ReturnType<typeof getOpenInvite>>>;

/** Members counting toward the pilot cap (D-029): not staff, not removed. */
export async function countPilotMembers(db: Queryable) {
  const row = firstRow(
    await db
      .select({ total: count() })
      .from(members)
      .where(
        and(
          eq(members.role, "member"),
          inArray(members.status, ["invited", "active"]),
        ),
      ),
  );
  return row?.total ?? 0;
}

/**
 * What /ops/waitlist shows (D-072): the pilot's free places, and everyone on
 * the waitlist, oldest first, with whether they've been let in and the state
 * of their newest unused link: when it expires, and whether it was emailed.
 * Staff only.
 */
export async function getWaitlistOverview(
  db: Queryable,
  now: Date = new Date(),
) {
  const [taken, rows] = await Promise.all([
    countPilotMembers(db),
    db
      .select({
        signupId: waitlistSignups.id,
        email: waitlistSignups.email,
        firstName: waitlistSignups.firstName,
        lastName: waitlistSignups.lastName,
        city: waitlistSignups.city,
        state: waitlistSignups.state,
        joinedAt: waitlistSignups.createdAt,
        approvedAt: waitlistSignups.approvedAt,
        linkExpiresAt: invites.expiresAt,
        linkEmailedAt: invites.emailedAt,
      })
      .from(waitlistSignups)
      .leftJoin(
        invites,
        and(
          eq(invites.waitlistSignupId, waitlistSignups.id),
          isNull(invites.usedAt),
        ),
      )
      .orderBy(asc(waitlistSignups.createdAt), asc(waitlistSignups.email)),
  ]);

  // A new link deletes the entry's unused one, so there's at most one each.
  const waitlist = rows.map((row) => ({
    signupId: row.signupId,
    email: row.email,
    name: [row.firstName, row.lastName].filter(Boolean).join(" ") || undefined,
    home: row.city && row.state ? `${row.city}, ${row.state}` : undefined,
    joinedAt: row.joinedAt,
    letIn: row.approvedAt !== null,
    // Letting in an email that wasn't on the list makes its row there and
    // then, so it was let in the moment it joined.
    addedOnOps: row.approvedAt?.getTime() === row.joinedAt.getTime(),
    link:
      row.linkExpiresAt === null
        ? null
        : {
            expiresAt: row.linkExpiresAt,
            open: row.linkExpiresAt > now,
            emailed: row.linkEmailedAt !== null,
          },
  }));

  return {
    cap: PILOT_MEMBER_CAP,
    placesLeft: Math.max(0, PILOT_MEMBER_CAP - taken),
    waitlist,
    letInNotJoined: waitlist.filter((entry) => entry.letIn).length,
  };
}

export type WaitlistOverview = Awaited<ReturnType<typeof getWaitlistOverview>>;

/**
 * Whether a member already has this email or this number. Get started checks
 * before saving to the waitlist, so someone who's already a member hears it at
 * once and can sign in instead.
 */
export async function findMemberClash(
  db: Queryable,
  input: { email: string; phone?: string },
) {
  const rows = await db
    .select({ phone: members.phone, email: members.email })
    .from(members)
    .where(
      input.phone
        ? or(eq(members.email, input.email), eq(members.phone, input.phone))
        : eq(members.email, input.email),
    );
  return {
    email: rows.some((row) => row.email === input.email),
    phone:
      Boolean(input.phone) && rows.some((row) => row.phone === input.phone),
  };
}
