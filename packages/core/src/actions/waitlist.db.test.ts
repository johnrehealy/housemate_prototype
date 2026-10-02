import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthAdmin } from "./context";
import { prepareSignupUser } from "../auth/prepare-signup-user";
import type { Db, Tx } from "../db/client";
import { getOpenInvite, getWaitlistOverview } from "../db/queries";
import {
  activityEvents,
  homes,
  invites,
  members,
  waitlistSignups,
} from "../db/schema";
import {
  createAuthUser,
  createHome,
  createMember,
  one,
  testDb,
  withRollback,
} from "../db/testing";
import { hashInviteToken } from "../invite-token";
import { TERMS_VERSION } from "../legal";
import { SMS_OPT_IN } from "../sms/opt-in";
import { createSimulatorProvider } from "../sms/simulator-provider";
import { acceptInvite } from "./accept-invite";
import type { ActionContext, Actor } from "./context";
import { ActionError, type ActionErrorCode } from "./errors";
import { joinWaitlist, type JoinWaitlistInput } from "./join-waitlist";
import { letIn } from "./let-in";
import { markLetInEmailed } from "./mark-let-in-emailed";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

// This suite's block of generated numbers.
let phoneCounter = 0;
const nextPhone = () => `+1555070${String(phoneCounter++).padStart(4, "0")}`;
const nextEmail = () => `someone-${randomUUID()}@example.com`;

const NOW = new Date("2026-10-02T18:00:00Z");
const EARLIER = new Date("2026-10-01T09:30:00Z");
const LATER = new Date("2026-10-02T19:00:00Z");
/** Inside the hour in which the page can still fix an entry's email. */
const JUST_NOW = new Date("2026-10-02T17:55:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const notUsed = () => Promise.reject(new Error("not used"));

function context(tx: Tx, actor: Actor, now = NOW): ActionContext {
  return {
    db: tx,
    actor,
    source: { type: "web" },
    services: {
      auth: {
        createUser: notUsed,
        findUserIds: notUsed,
        createSignupUser: notUsed,
        setEmail: notUsed,
        deleteUser: notUsed,
      },
      sms: createSimulatorProvider(),
    },
    now,
  };
}

const system: Actor = { type: "system" };

/** A staff member, who lets people in. */
async function staffContext(tx: Tx, now = NOW) {
  const staff = await createMember(tx, {
    homeId: null,
    phone: nextPhone(),
    role: "staff",
  });
  return { staff, staffCtx: context(tx, { type: "staff", id: staff.id }, now) };
}

/** What G3's Continue sends, for a generated person and address. */
function details(
  overrides: Partial<JoinWaitlistInput> = {},
): JoinWaitlistInput {
  return {
    email: nextEmail(),
    firstName: "Sam",
    lastName: "Sample",
    textsAgreed: false,
    termsVersion: TERMS_VERSION,
    address: {
      line1: "1450 Sample Street",
      unit: "Apt 2",
      city: "Testville",
      state: "IL",
      zip: "00001",
      placeId: "fake-place-1",
    },
    timezone: "America/Chicago",
    ...overrides,
  };
}

/** Details with a number and the texts box ticked. */
function withTexts(overrides: Partial<JoinWaitlistInput> = {}) {
  return details({
    phone: nextPhone(),
    textsAgreed: true,
    textsVersion: SMS_OPT_IN.version,
    ...overrides,
  });
}

const failsWith = (code: ActionErrorCode) => (error: unknown) =>
  error instanceof ActionError && error.code === code;

async function eventsFor(tx: Tx, entityType: string, entityId: string) {
  return tx
    .select({
      action: activityEvents.action,
      homeId: activityEvents.homeId,
      actorType: activityEvents.actorType,
      actorId: activityEvents.actorId,
      sourceType: activityEvents.sourceType,
      before: activityEvents.before,
      after: activityEvents.after,
    })
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.entityType, entityType),
        eq(activityEvents.entityId, entityId),
      ),
    )
    .orderBy(activityEvents.createdAt);
}

async function rowFor(tx: Tx, email: string) {
  return one(
    await tx
      .select()
      .from(waitlistSignups)
      .where(eq(waitlistSignups.email, email)),
  );
}

/** Fills the pilot's places with generated members. */
async function fillPilot(tx: Tx) {
  const taken = await tx
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.role, "member"),
        inArray(members.status, ["invited", "active"]),
      ),
    );
  const home = await createHome(tx, "Full pilot");
  for (let i = taken.length; i < 10; i++) {
    await createMember(tx, { homeId: home.id, phone: nextPhone() });
  }
}

/** Someone who gave their details, then was let in: their emailed link. */
async function letInWithDetails(tx: Tx, input: JoinWaitlistInput) {
  const { staffCtx } = await staffContext(tx);
  await joinWaitlist(context(tx, system, EARLIER), input);
  return letIn(staffCtx, { email: input.email });
}

describe("joinWaitlist", () => {
  it("saves the details, with no number, and waits", async () => {
    await withRollback(db, async (tx) => {
      const input = details();

      const result = await joinWaitlist(context(tx, system), input);

      const row = await rowFor(tx, input.email);
      expect(result).toEqual({
        status: "waitlisted",
        isNew: true,
        signupId: row.id,
        email: input.email,
        joinedAt: NOW,
      });
      expect(row).toMatchObject({
        firstName: "Sam",
        lastName: "Sample",
        phone: null,
        addressLine1: "1450 Sample Street",
        addressUnit: "Apt 2",
        city: "Testville",
        state: "IL",
        zip: "00001",
        placeId: "fake-place-1",
        timezone: "America/Chicago",
        termsVersion: TERMS_VERSION,
        smsConsentVersion: null,
        smsConsentAt: null,
        approvedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      });

      // Nothing about the person goes into the log.
      expect(await eventsFor(tx, "waitlist_signup", row.id)).toEqual([
        {
          action: "joined",
          homeId: null,
          actorType: "system",
          actorId: null,
          sourceType: "web",
          before: null,
          after: {
            termsVersion: TERMS_VERSION,
            hasPhone: false,
            smsConsentVersion: null,
          },
        },
      ]);
    });
  });

  it("keeps one row per address however it's typed, and refuses what isn't one", async () => {
    await withRollback(db, async (tx) => {
      const email = nextEmail();
      await joinWaitlist(context(tx, system), details({ email }));
      const again = await joinWaitlist(
        context(tx, system),
        details({ email: `  ${email.toUpperCase()}  ` }),
      );

      expect(again).toMatchObject({ status: "waitlisted", isNew: false });
      expect((await rowFor(tx, email)).email).toBe(email);

      for (const bad of ["", "someone", "someone@example", "a b@example.com"]) {
        await expect(
          joinWaitlist(context(tx, system), details({ email: bad })),
          bad,
        ).rejects.toSatisfy(failsWith("invalid_input"));
      }
    });
  });

  it("keeps the texts agreement's wording and time on the row", async () => {
    await withRollback(db, async (tx) => {
      const input = withTexts();

      await joinWaitlist(context(tx, system), input);

      expect(await rowFor(tx, input.email)).toMatchObject({
        phone: input.phone,
        smsConsentVersion: SMS_OPT_IN.version,
        smsConsentAt: NOW,
      });
    });
  });

  it("refuses the texts box without a number, or wording or Terms the page no longer shows", async () => {
    await withRollback(db, async (tx) => {
      const ctx = context(tx, system);
      await expect(
        joinWaitlist(ctx, withTexts({ phone: undefined })),
      ).rejects.toSatisfy(failsWith("invalid_input"));
      await expect(
        joinWaitlist(ctx, withTexts({ textsVersion: "2026-09-30" })),
      ).rejects.toSatisfy(failsWith("invalid_input"));
      await expect(
        joinWaitlist(ctx, details({ termsVersion: "2026-09-30" })),
      ).rejects.toSatisfy(failsWith("invalid_input"));
    });
  });

  it("updates the same row when someone goes through again", async () => {
    await withRollback(db, async (tx) => {
      const first = withTexts();
      await joinWaitlist(context(tx, system, EARLIER), first);

      const again = await joinWaitlist(context(tx, system), {
        ...first,
        firstName: "Samantha",
        textsAgreed: false,
        textsVersion: undefined,
      });

      expect(again).toMatchObject({ status: "waitlisted", isNew: false });
      const row = await rowFor(tx, first.email);
      expect(row).toMatchObject({
        firstName: "Samantha",
        // Unticking the box clears the agreement.
        smsConsentVersion: null,
        smsConsentAt: null,
        createdAt: EARLIER,
        updatedAt: NOW,
      });
      expect(
        (await eventsFor(tx, "waitlist_signup", row.id)).map((e) => e.action),
      ).toEqual(["joined", "details_updated"]);
    });
  });

  it("says when the email or number is already a member's, and saves nothing", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx);
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
        email: nextEmail(),
      });

      const byEmail = details({ email: member.email ?? undefined });
      expect(await joinWaitlist(context(tx, system), byEmail)).toEqual({
        status: "member",
        field: "email",
      });
      const byPhone = withTexts({ phone: member.phone ?? undefined });
      expect(await joinWaitlist(context(tx, system), byPhone)).toEqual({
        status: "member",
        field: "phone",
      });

      const saved = await tx
        .select()
        .from(waitlistSignups)
        .where(inArray(waitlistSignups.email, [byEmail.email, byPhone.email]));
      expect(saved).toEqual([]);
    });
  });

  it("hands a link to the page for someone on the alpha list, while there's room", async () => {
    await withRollback(db, async (tx) => {
      const { staff, staffCtx } = await staffContext(tx);
      const texted = withTexts();
      const emailed = details();
      for (const input of [texted, emailed]) {
        await letIn(staffCtx, { email: input.email });
      }

      const byText = await joinWaitlist(context(tx, system), texted);
      const byEmail = await joinWaitlist(context(tx, system), emailed);

      expect(byText).toMatchObject({ status: "continue", channel: "sms" });
      expect(byEmail).toMatchObject({ status: "continue", channel: "email" });
      if (byText.status !== "continue") throw new Error("Expected a link");

      // The page's link replaces the emailed one, and doesn't prove the email.
      const open = await getOpenInvite(tx, byText.token, NOW);
      expect(open).toMatchObject({ email: texted.email, delivery: "page" });
      const links = await tx
        .select()
        .from(invites)
        .where(eq(invites.email, texted.email));
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({ createdBy: staff.id, usedAt: null });
    });
  });

  it("keeps the emailed link the page came from, and ignores anyone else's", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const mine = details();
      const theirs = details();
      const emailed = await letIn(staffCtx, { email: mine.email });
      const other = await letIn(staffCtx, { email: theirs.email });

      // Their own link: the same one comes back, still emailed.
      const kept = await joinWaitlist(context(tx, system), {
        ...mine,
        token: emailed.token,
      });
      expect(kept).toEqual({
        status: "continue",
        token: emailed.token,
        channel: "email",
      });
      expect(await getOpenInvite(tx, emailed.token, NOW)).toMatchObject({
        delivery: "email",
      });

      // Someone else's link proves nothing about this email.
      const fresh = await joinWaitlist(context(tx, system), {
        ...theirs,
        email: mine.email,
        token: other.token,
      });
      if (fresh.status !== "continue") throw new Error("Expected a link");
      expect(fresh.token).not.toBe(other.token);
      expect(await getOpenInvite(tx, fresh.token, NOW)).toMatchObject({
        email: mine.email,
        delivery: "page",
      });
      expect(await getOpenInvite(tx, other.token, NOW)).toMatchObject({
        email: theirs.email,
      });
    });
  });

  it("moves a just-saved entry to the corrected email, as one entry", async () => {
    await withRollback(db, async (tx) => {
      const typo = withTexts();
      const first = await joinWaitlist(context(tx, system, JUST_NOW), typo);
      if (first.status !== "waitlisted") throw new Error("Expected waitlisted");

      const fixed = { ...typo, email: nextEmail(), replaces: first.signupId };
      const again = await joinWaitlist(context(tx, system), fixed);

      expect(again).toMatchObject({
        status: "waitlisted",
        isNew: false,
        signupId: first.signupId,
        email: fixed.email,
        joinedAt: JUST_NOW,
      });
      const left = await tx
        .select({ id: waitlistSignups.id })
        .from(waitlistSignups)
        .where(inArray(waitlistSignups.email, [typo.email, fixed.email]));
      expect(left).toEqual([{ id: first.signupId }]);
      expect(await rowFor(tx, fixed.email)).toMatchObject({
        phone: typo.phone,
        createdAt: JUST_NOW,
        updatedAt: NOW,
      });

      const events = await eventsFor(tx, "waitlist_signup", first.signupId);
      expect(events.map((e) => e.action)).toEqual(["joined", "email_changed"]);
      // Neither address goes into the log.
      for (const event of events) {
        const logged = JSON.stringify(event);
        expect(logged).not.toContain(typo.email);
        expect(logged).not.toContain(fixed.email);
      }
    });
  });

  it("updates the corrected email's own entry, and deletes the mistyped one", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const right = details();
      // The right email is already on the alpha list.
      await letIn(staffCtx, { email: right.email });

      const typo = await joinWaitlist(context(tx, system, JUST_NOW), {
        ...right,
        email: nextEmail(),
      });
      if (typo.status !== "waitlisted") throw new Error("Expected waitlisted");

      const fixed = await joinWaitlist(context(tx, system), {
        ...right,
        replaces: typo.signupId,
      });

      expect(fixed).toMatchObject({ status: "continue", channel: "email" });
      expect(await rowFor(tx, right.email)).toMatchObject({ firstName: "Sam" });
      expect(
        await tx
          .select()
          .from(waitlistSignups)
          .where(eq(waitlistSignups.id, typo.signupId)),
      ).toEqual([]);
      const events = await eventsFor(tx, "waitlist_signup", typo.signupId);
      expect(events.map((e) => [e.action, e.after])).toEqual([
        ["joined", expect.anything()],
        ["removed", { reason: "email_changed" }],
      ]);
    });
  });

  it("ignores an entry that's been let in, saved over an hour ago, or has the same email", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const hourAgo = new Date(NOW.getTime() - 61 * 60 * 1000);

      const letInRow = details();
      await joinWaitlist(context(tx, system, hourAgo), letInRow);
      await letIn(staffCtx, { email: letInRow.email });
      const stale = details();
      await joinWaitlist(context(tx, system, hourAgo), stale);
      const same = details();
      await joinWaitlist(context(tx, system, JUST_NOW), same);

      for (const kept of [letInRow, stale]) {
        const { id } = await rowFor(tx, kept.email);
        const result = await joinWaitlist(context(tx, system), {
          ...kept,
          email: nextEmail(),
          replaces: id,
        });
        expect(result).toMatchObject({ isNew: true });
        expect(await rowFor(tx, kept.email)).toMatchObject({ id });
      }

      const { id } = await rowFor(tx, same.email);
      expect(
        await joinWaitlist(context(tx, system), { ...same, replaces: id }),
      ).toMatchObject({ status: "waitlisted", isNew: false, signupId: id });

      // An id that isn't an entry changes nothing either.
      expect(
        await joinWaitlist(context(tx, system), {
          ...details(),
          replaces: randomUUID(),
        }),
      ).toMatchObject({ isNew: true });
    });
  });

  it("waits when the pilot is full, even on the alpha list", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const input = details();
      await letIn(staffCtx, { email: input.email });
      await fillPilot(tx);

      expect(await joinWaitlist(context(tx, system), input)).toMatchObject({
        status: "waitlisted",
        isNew: false,
      });
    });
  });
});

describe("letIn", () => {
  it("puts a new email on the alpha list and makes a 14-day link", async () => {
    await withRollback(db, async (tx) => {
      const { staff, staffCtx } = await staffContext(tx);
      const email = nextEmail();

      const result = await letIn(staffCtx, { email: email.toUpperCase() });

      const row = await rowFor(tx, email);
      expect(row).toMatchObject({
        firstName: null,
        approvedAt: NOW,
        approvedBy: staff.id,
      });
      expect(result).toMatchObject({
        signupId: row.id,
        email,
        firstName: undefined,
        expiresAt: new Date(NOW.getTime() + 14 * DAY_MS),
        newlyApproved: true,
      });

      // Only the link's hash is kept.
      const invite = one(
        await tx.select().from(invites).where(eq(invites.email, email)),
      );
      expect(invite).toMatchObject({
        tokenHash: hashInviteToken(result.token),
        delivery: "email",
        waitlistSignupId: row.id,
        createdBy: staff.id,
        emailedAt: null,
      });
      expect(result.inviteId).toBe(invite.id);
      expect(JSON.stringify(invite)).not.toContain(result.token);

      const logged = JSON.stringify([
        ...(await eventsFor(tx, "waitlist_signup", row.id)),
        ...(await eventsFor(tx, "invite", invite.id)),
      ]);
      expect(logged).not.toContain(result.token);
      expect(logged).not.toContain(email);
      expect(
        (await eventsFor(tx, "waitlist_signup", row.id)).map((e) => e.action),
      ).toEqual(["approved"]);
    });
  });

  it("sends again with a new link, and keeps when they were first let in", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx, EARLIER);
      const input = details();
      await joinWaitlist(context(tx, system, EARLIER), input);

      const first = await letIn(staffCtx, { email: input.email });
      const second = await letIn(
        { ...staffCtx, now: NOW },
        {
          email: input.email,
        },
      );

      expect(first.firstName).toBe("Sam");
      expect(second.newlyApproved).toBe(false);
      expect((await rowFor(tx, input.email)).approvedAt).toEqual(EARLIER);
      expect(await getOpenInvite(tx, first.token, NOW)).toBeUndefined();
      expect(await getOpenInvite(tx, second.token, NOW)).toBeDefined();
    });
  });

  it("is for staff only, and not for members or a full pilot", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      await expect(
        letIn(context(tx, system), { email: nextEmail() }),
      ).rejects.toSatisfy(failsWith("invalid_input"));

      const home = await createHome(tx);
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
        email: nextEmail(),
      });
      await expect(
        letIn(staffCtx, { email: member.email ?? "" }),
      ).rejects.toSatisfy(failsWith("conflict"));

      await fillPilot(tx);
      await expect(letIn(staffCtx, { email: nextEmail() })).rejects.toSatisfy(
        failsWith("member_cap"),
      );
    });
  });
});

describe("markLetInEmailed", () => {
  it("marks an emailed link once, so ops can say it went", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const email = nextEmail();
      const { inviteId, signupId } = await letIn(staffCtx, { email });

      const before = await getWaitlistOverview(tx, NOW);
      expect(
        before.waitlist.find((entry) => entry.signupId === signupId)?.link,
      ).toMatchObject({ emailed: false });

      expect(await markLetInEmailed(staffCtx, { inviteId })).toEqual({
        marked: true,
      });
      expect(
        await markLetInEmailed({ ...staffCtx, now: LATER }, { inviteId }),
      ).toEqual({ marked: false });

      const invite = one(
        await tx.select().from(invites).where(eq(invites.id, inviteId)),
      );
      expect(invite.emailedAt).toEqual(NOW);
      const events = await eventsFor(tx, "invite", inviteId);
      expect(events.map((event) => event.action)).toEqual([
        "created",
        "emailed",
      ]);
      expect(JSON.stringify(events)).not.toContain(email);
    });
  });

  it("leaves a link handed to the page, and is for staff only", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const input = details();
      await letIn(staffCtx, { email: input.email });
      const joined = await joinWaitlist(context(tx, system), input);
      if (joined.status !== "continue") throw new Error("expected a link");
      const pageLink = one(
        await tx
          .select({ id: invites.id })
          .from(invites)
          .where(eq(invites.email, input.email)),
      );

      expect(
        await markLetInEmailed(staffCtx, { inviteId: pageLink.id }),
      ).toEqual({ marked: false });
      await expect(
        markLetInEmailed(context(tx, system), { inviteId: pageLink.id }),
      ).rejects.toSatisfy(failsWith("invalid_input"));
    });
  });
});

describe("getOpenInvite", () => {
  it("opens nothing for a used, expired or made-up link", async () => {
    await withRollback(db, async (tx) => {
      const { token, expiresAt } = await letInWithDetails(tx, details());

      expect(await getOpenInvite(tx, token, NOW)).toMatchObject({
        signup: { firstName: "Sam", city: "Testville" },
      });
      expect(await getOpenInvite(tx, token, expiresAt)).toBeUndefined();
      expect(await getOpenInvite(tx, "made-up", NOW)).toBeUndefined();
    });
  });
});

describe("getWaitlistOverview", () => {
  it("lists the waitlist oldest first, with who's been let in", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const waiting = details({ firstName: "Wren", lastName: "Waiting" });
      await joinWaitlist(context(tx, system, EARLIER), waiting);
      const emailOnly = nextEmail();
      const { inviteId } = await letIn(staffCtx, { email: emailOnly });
      await markLetInEmailed(staffCtx, { inviteId });

      const overview = await getWaitlistOverview(tx, NOW);
      const mine = overview.waitlist.filter((entry) =>
        [waiting.email, emailOnly].includes(entry.email),
      );

      expect(mine).toEqual([
        {
          signupId: expect.any(String),
          email: waiting.email,
          name: "Wren Waiting",
          home: "Testville, IL",
          joinedAt: EARLIER,
          letIn: false,
          addedOnOps: false,
          link: null,
        },
        {
          signupId: expect.any(String),
          email: emailOnly,
          name: undefined,
          home: undefined,
          joinedAt: NOW,
          letIn: true,
          addedOnOps: true,
          link: {
            expiresAt: new Date(NOW.getTime() + 14 * DAY_MS),
            open: true,
            emailed: true,
          },
        },
      ]);
      expect(overview.letInNotJoined).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("acceptInvite", () => {
  it("creates the member and home from the row, with texts agreed at the row's time", async () => {
    await withRollback(db, async (tx) => {
      const input = withTexts();
      const { token } = await letInWithDetails(tx, input);
      const phone = input.phone ?? "";
      const userId = await createAuthUser(tx, phone);
      const { inviteId } = one(
        await tx
          .select({ inviteId: invites.id })
          .from(invites)
          .where(eq(invites.tokenHash, hashInviteToken(token))),
      );

      const result = await acceptInvite(context(tx, system), {
        token,
        userId,
        proof: { channel: "sms", phone },
      });

      const { memberId, homeId } = result;
      expect(result).toMatchObject({
        email: input.email,
        phone,
        firstName: "Sam",
        // The link was emailed, which proves the address.
        emailProven: true,
      });
      expect(
        one(await tx.select().from(members).where(eq(members.id, memberId))),
      ).toMatchObject({
        userId,
        homeId,
        phone,
        email: input.email,
        firstName: "Sam",
        lastName: "Sample",
        role: "member",
        status: "active",
        smsConsentAt: EARLIER,
      });
      expect(
        one(await tx.select().from(homes).where(eq(homes.id, homeId))),
      ).toMatchObject({
        name: "Sam's home",
        address: "1450 Sample Street, Apt 2, Testville, IL 00001",
        placeId: "fake-place-1",
        timezone: "America/Chicago",
      });

      // The link is spent, and the row is gone: the member holds it all now.
      expect(
        one(await tx.select().from(invites).where(eq(invites.id, inviteId))),
      ).toMatchObject({ usedAt: NOW, memberId });
      expect(
        await tx
          .select()
          .from(waitlistSignups)
          .where(eq(waitlistSignups.email, input.email)),
      ).toEqual([]);

      const asMember = {
        homeId,
        actorType: "member",
        actorId: memberId,
        sourceType: "web",
      };
      expect(await eventsFor(tx, "member", memberId)).toEqual([
        {
          ...asMember,
          action: "joined",
          before: null,
          after: {
            phone,
            firstName: "Sam",
            role: "member",
            status: "active",
            termsVersion: TERMS_VERSION,
            signedInBy: "sms",
          },
        },
        {
          ...asMember,
          action: "sms_opted_in",
          before: { smsConsentAt: null },
          after: {
            smsConsentAt: EARLIER.toISOString(),
            recordedAt: NOW.toISOString(),
            phone,
            method: "web_form",
            page: "/get-started",
            disclosureVersion: SMS_OPT_IN.version,
            label: SMS_OPT_IN.label,
            smallPrint: SMS_OPT_IN.smallPrint,
          },
        },
      ]);

      // The address stays on the home, out of the log.
      const logged = JSON.stringify(
        await tx
          .select({ after: activityEvents.after })
          .from(activityEvents)
          .where(eq(activityEvents.homeId, homeId)),
      );
      expect(logged).not.toContain("Sample Street");
      expect(logged).not.toContain("fake-place-1");
    });
  });

  it("creates a member with no number from an emailed code, and records no consent", async () => {
    await withRollback(db, async (tx) => {
      const input = details();
      const { token } = await letInWithDetails(tx, input);
      const userId = await createAuthUser(tx, { email: input.email });

      const result = await acceptInvite(context(tx, system), {
        token,
        userId,
        proof: { channel: "email", email: input.email },
      });

      expect(result).toMatchObject({ phone: null, emailProven: true });
      expect(
        one(
          await tx
            .select()
            .from(members)
            .where(eq(members.id, result.memberId)),
        ),
      ).toMatchObject({ phone: null, email: input.email, smsConsentAt: null });
      expect(
        (await eventsFor(tx, "member", result.memberId)).map((e) => e.action),
      ).toEqual(["joined"]);
    });
  });

  it("doesn't count a link handed to the page as proof of the email", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const input = withTexts();
      await letIn(staffCtx, { email: input.email });
      const joined = await joinWaitlist(context(tx, system), input);
      if (joined.status !== "continue") throw new Error("Expected a link");
      const phone = input.phone ?? "";

      const result = await acceptInvite(context(tx, system), {
        token: joined.token,
        userId: await createAuthUser(tx, phone),
        proof: { channel: "sms", phone },
      });

      expect(result.emailProven).toBe(false);
    });
  });

  it("refuses a code that went somewhere the row doesn't say", async () => {
    await withRollback(db, async (tx) => {
      const input = withTexts();
      const { token } = await letInWithDetails(tx, input);
      const ctx = context(tx, system);

      const otherPhone = nextPhone();
      await expect(
        acceptInvite(ctx, {
          token,
          userId: await createAuthUser(tx, otherPhone),
          proof: { channel: "sms", phone: otherPhone },
        }),
      ).rejects.toSatisfy(failsWith("stale_details"));
      // A row with a number signs in by text, not email.
      await expect(
        acceptInvite(ctx, {
          token,
          userId: await createAuthUser(tx, { email: input.email }),
          proof: { channel: "email", email: input.email },
        }),
      ).rejects.toSatisfy(failsWith("stale_details"));
    });
  });

  it("sends people back through Get started when the details are missing or out of date", async () => {
    await withRollback(db, async (tx) => {
      const { staffCtx } = await staffContext(tx);
      const ctx = context(tx, system);

      // From the old email bar: an email and nothing else.
      const emailOnly = nextEmail();
      const bare = await letIn(staffCtx, { email: emailOnly });
      await expect(
        acceptInvite(ctx, {
          token: bare.token,
          userId: await createAuthUser(tx, { email: emailOnly }),
          proof: { channel: "email", email: emailOnly },
        }),
      ).rejects.toSatisfy(failsWith("stale_details"));

      // Agreed under Terms or texts wording that has since changed.
      for (const change of [
        { termsVersion: "2026-09-30" },
        { smsConsentVersion: "2026-09-30" },
      ]) {
        const input = withTexts();
        const { token } = await letInWithDetails(tx, input);
        await tx
          .update(waitlistSignups)
          .set(change)
          .where(eq(waitlistSignups.email, input.email));
        const phone = input.phone ?? "";
        await expect(
          acceptInvite(ctx, {
            token,
            userId: await createAuthUser(tx, phone),
            proof: { channel: "sms", phone },
          }),
        ).rejects.toSatisfy(failsWith("stale_details"));
      }
    });
  });

  it("drops the person's other unused links", async () => {
    await withRollback(db, async (tx) => {
      const { staff, staffCtx } = await staffContext(tx);
      const input = details();
      await joinWaitlist(context(tx, system, EARLIER), input);
      const { token } = await letIn(staffCtx, { email: input.email });
      // A stray link for the same address, not tied to the row.
      await tx.insert(invites).values({
        tokenHash: hashInviteToken("stray"),
        delivery: "email",
        email: input.email,
        createdBy: staff.id,
        expiresAt: new Date(NOW.getTime() + DAY_MS),
      });

      await acceptInvite(context(tx, system), {
        token,
        userId: await createAuthUser(tx, { email: input.email }),
        proof: { channel: "email", email: input.email },
      });

      expect(
        await tx
          .select({ id: invites.id })
          .from(invites)
          .where(eq(invites.tokenHash, hashInviteToken("stray"))),
      ).toEqual([]);
    });
  });

  it("refuses a link that's been used, has expired, or doesn't exist", async () => {
    await withRollback(db, async (tx) => {
      const input = details();
      const { token, expiresAt } = await letInWithDetails(tx, input);
      const accept = (now: Date, linkToken = token) =>
        acceptInvite(context(tx, system, now), {
          token: linkToken,
          userId: randomUUID(),
          proof: { channel: "email", email: input.email },
        });

      await expect(accept(expiresAt)).rejects.toSatisfy(failsWith("conflict"));
      await expect(accept(NOW, "made-up")).rejects.toSatisfy(
        failsWith("not_found"),
      );

      await acceptInvite(context(tx, system), {
        token,
        userId: await createAuthUser(tx, { email: input.email }),
        proof: { channel: "email", email: input.email },
      });
      await expect(accept(NOW)).rejects.toSatisfy(failsWith("conflict"));
    });
  });

  it("refuses a number that became a member's, and a full pilot", async () => {
    await withRollback(db, async (tx) => {
      const input = withTexts();
      const { token } = await letInWithDetails(tx, input);
      const phone = input.phone ?? "";
      const home = await createHome(tx);
      // Someone else took the number after the row was saved.
      await createMember(tx, { homeId: home.id, phone });

      await expect(
        acceptInvite(context(tx, system), {
          token,
          userId: await createAuthUser(tx, { email: input.email }),
          proof: { channel: "sms", phone },
        }),
      ).rejects.toSatisfy(failsWith("conflict"));

      const other = details();
      const second = await letInWithDetails(tx, other);
      await fillPilot(tx);
      await expect(
        acceptInvite(context(tx, system), {
          token: second.token,
          userId: await createAuthUser(tx, { email: other.email }),
          proof: { channel: "email", email: other.email },
        }),
      ).rejects.toSatisfy(failsWith("member_cap"));
    });
  });
});

describe("prepareSignupUser", () => {
  /** An AuthAdmin over the test database's auth.users, recording what it did. */
  function fakeAuth(tx: Tx, found: string[]) {
    const deleted: string[] = [];
    const created: unknown[] = [];
    const auth: AuthAdmin = {
      createUser: notUsed,
      setEmail: notUsed,
      findUserIds: async () => found,
      createSignupUser: async (input) => {
        created.push(input);
        return { userId: randomUUID() };
      },
      deleteUser: async (userId) => {
        deleted.push(userId);
      },
    };
    return { auth, deleted, created, db: tx };
  }

  it("clears an earlier attempt's account, then makes one by number or by email", async () => {
    await withRollback(db, async (tx) => {
      const abandoned = await createAuthUser(tx, nextPhone());
      const phone = nextPhone();
      const byPhone = fakeAuth(tx, [abandoned]);

      await prepareSignupUser(byPhone, { email: nextEmail(), phone });
      expect(byPhone.deleted).toEqual([abandoned]);
      expect(byPhone.created).toEqual([{ phone }]);

      const email = nextEmail();
      const byEmail = fakeAuth(tx, []);
      await prepareSignupUser(byEmail, { email });
      expect(byEmail.created).toEqual([{ email }]);
    });
  });

  it("never touches a member's account", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx);
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const auth = fakeAuth(tx, [member.userId]);

      await expect(
        prepareSignupUser(auth, { email: nextEmail() }),
      ).rejects.toThrow("a member's sign-in account");
      expect(auth.deleted).toEqual([]);
      expect(auth.created).toEqual([]);
    });
  });
});
