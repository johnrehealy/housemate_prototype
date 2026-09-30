import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db, Tx } from "../db/client";
import { activityEvents, homes, members } from "../db/schema";
import {
  createHome,
  createMember,
  one,
  testDb,
  withRollback,
} from "../db/testing";
import { createSimulatorProvider } from "../sms/simulator-provider";
import { SMS_OPT_IN } from "../sms/opt-in";
import type { ActionContext } from "./context";
import { ActionError } from "./errors";
import { optInToTexts } from "./opt-in-to-texts";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

// This suite's block of generated numbers.
let phoneCounter = 0;
const nextPhone = () => `+1555091${String(phoneCounter++).padStart(4, "0")}`;

const NOW = new Date("2026-09-28T18:00:00Z");

/** The welcome step's context: the signed-in member, from the web. */
function context(db: Tx | Db, memberId: string): ActionContext {
  return {
    db,
    actor: { type: "member", id: memberId },
    source: { type: "web" },
    services: {
      auth: {
        createUser: () => Promise.reject(new Error("not used")),
        deleteUser: () => Promise.reject(new Error("not used")),
      },
      sms: createSimulatorProvider(),
    },
    now: NOW,
  };
}

const input = (memberId: string) => ({
  memberId,
  disclosureVersion: SMS_OPT_IN.version,
});

async function consentAt(tx: Tx, memberId: string) {
  const row = one(
    await tx
      .select({ smsConsentAt: members.smsConsentAt })
      .from(members)
      .where(eq(members.id, memberId)),
  );
  return row.smsConsentAt;
}

async function optInEvents(tx: Tx | Db, memberId: string) {
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
        eq(activityEvents.entityType, "member"),
        eq(activityEvents.entityId, memberId),
        eq(activityEvents.action, "sms_opted_in"),
      ),
    );
}

const isInvalidInput = (error: unknown) =>
  error instanceof ActionError && error.code === "invalid_input";

describe("optInToTexts", () => {
  it("records a member's consent with the wording they agreed to", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx);
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
        status: "invited",
      });

      const result = await optInToTexts(
        context(tx, member.id),
        input(member.id),
      );

      expect(result).toEqual({ outcome: "opted_in", consentAt: NOW });
      expect(await consentAt(tx, member.id)).toEqual(NOW);

      // The record outlives the member row, so it carries the number and the
      // exact wording as well as the time.
      expect(await optInEvents(tx, member.id)).toEqual([
        {
          action: "sms_opted_in",
          homeId: home.id,
          actorType: "member",
          actorId: member.id,
          sourceType: "web",
          before: { smsConsentAt: null },
          after: {
            smsConsentAt: NOW.toISOString(),
            phone: member.phone,
            method: "web_form",
            page: "/welcome",
            disclosureVersion: SMS_OPT_IN.version,
            label: SMS_OPT_IN.label,
            text: SMS_OPT_IN.text,
          },
        },
      ]);
    });
  });

  it("changes nothing when the member has already agreed", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx);
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      await optInToTexts(context(tx, member.id), input(member.id));

      const later = {
        ...context(tx, member.id),
        now: new Date("2026-09-29T18:00:00Z"),
      };
      const second = await optInToTexts(later, input(member.id));

      // The first agreement stands: its time isn't moved, and there's no
      // second record.
      expect(second).toEqual({ outcome: "already_opted_in" });
      expect(await consentAt(tx, member.id)).toEqual(NOW);
      expect(await optInEvents(tx, member.id)).toHaveLength(1);
    });
  });

  it("records nothing for staff, removed members or an unknown ID", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx);
      const removed = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
        status: "removed",
      });
      const staff = await createMember(tx, {
        homeId: null,
        phone: nextPhone(),
        role: "staff",
      });

      for (const person of [removed, staff]) {
        const result = await optInToTexts(
          context(tx, person.id),
          input(person.id),
        );

        expect(result).toEqual({ outcome: "not_eligible" });
        expect(await consentAt(tx, person.id)).toBeNull();
        expect(await optInEvents(tx, person.id)).toEqual([]);
      }

      const unknown = randomUUID();
      expect(await optInToTexts(context(tx, unknown), input(unknown))).toEqual({
        outcome: "not_eligible",
      });
    });
  });

  it("refuses wording the page no longer shows", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx);
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });

      await expect(
        optInToTexts(context(tx, member.id), {
          memberId: member.id,
          disclosureVersion: "2026-09-25",
        }),
      ).rejects.toSatisfy(isInvalidInput);

      expect(await consentAt(tx, member.id)).toBeNull();
      expect(await optInEvents(tx, member.id)).toEqual([]);
    });
  });

  it("records one agreement when two arrive at once", async () => {
    // Two separate transactions racing, so this one commits real rows and
    // removes them afterwards.
    const { homeId, memberId, userId } = await db.transaction(async (tx) => {
      const home = await createHome(tx);
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
        status: "invited",
      });
      return { homeId: home.id, memberId: member.id, userId: member.userId };
    });

    try {
      const results = await Promise.all([
        optInToTexts(context(db, memberId), input(memberId)),
        optInToTexts(context(db, memberId), input(memberId)),
      ]);

      expect(results.map((result) => result.outcome).sort()).toEqual([
        "already_opted_in",
        "opted_in",
      ]);
      expect(await optInEvents(db, memberId)).toHaveLength(1);
    } finally {
      await db.transaction(async (tx) => {
        // The activity log is append-only, even for the server. Replica mode
        // skips that trigger for this transaction only, so the test can take
        // back the event it committed. It needs the local superuser.
        await tx.execute(sql`set local session_replication_role = replica`);
        await tx
          .delete(activityEvents)
          .where(
            and(
              eq(activityEvents.entityType, "member"),
              eq(activityEvents.entityId, memberId),
            ),
          );
        await tx.delete(members).where(eq(members.id, memberId));
        await tx.execute(
          sql`delete from auth.users where id = ${userId}::uuid`,
        );
        await tx.delete(homes).where(eq(homes.id, homeId));
      });
    }
  });
});
