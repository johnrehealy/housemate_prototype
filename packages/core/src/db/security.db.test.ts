import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./client";
import {
  activityEvents,
  alerts,
  conversations,
  homes,
  members,
  messages,
  usageCosts,
  waitlistSignups,
} from "./schema";
import {
  actAs,
  actAsAnon,
  createHome,
  createMember,
  expectDbError,
  one,
  testDb,
  withRollback,
  type Tx,
} from "./testing";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

let phoneCounter = 0;
// 555-01xx numbers are reserved for fiction.
const nextPhone = () => `+1555010${String(phoneCounter++).padStart(4, "0")}`;

/** Two homes, each with an active member, a conversation, a text and an activity event. */
async function twoHomes(tx: Tx) {
  const homeA = await createHome(tx, "Home A");
  const homeB = await createHome(tx, "Home B");
  const alice = await createMember(tx, {
    homeId: homeA.id,
    phone: nextPhone(),
  });
  const bob = await createMember(tx, { homeId: homeB.id, phone: nextPhone() });

  for (const [home, member] of [
    [homeA, alice],
    [homeB, bob],
  ] as const) {
    const conversation = one(
      await tx.insert(conversations).values({ homeId: home.id }).returning(),
    );
    await tx.insert(messages).values({
      homeId: home.id,
      memberId: member.id,
      conversationId: conversation.id,
      direction: "inbound",
      channel: "sms",
      author: "member",
      body: "Hello",
      fromPhone: member.phone,
      deliveryStatus: "received",
    });
    await tx.insert(activityEvents).values({
      homeId: home.id,
      entityType: "conversation",
      entityId: conversation.id,
      action: "created",
      actorType: "system",
      sourceType: "system",
    });
  }
  return { homeA, homeB, alice, bob };
}

describe("row-level security", () => {
  it("shows a member only their own home's rows", async () => {
    await withRollback(db, async (tx) => {
      const { homeA, alice } = await twoHomes(tx);
      await actAs(tx, alice.userId);

      expect(await tx.select({ id: homes.id }).from(homes)).toEqual([
        { id: homeA.id },
      ]);
      expect(await tx.select({ id: members.id }).from(members)).toEqual([
        { id: alice.id },
      ]);
      expect(
        await tx.select({ homeId: conversations.homeId }).from(conversations),
      ).toEqual([{ homeId: homeA.id }]);
      expect(
        await tx.select({ homeId: messages.homeId }).from(messages),
      ).toEqual([{ homeId: homeA.id }]);
      expect(
        await tx.select({ homeId: activityEvents.homeId }).from(activityEvents),
      ).toEqual([{ homeId: homeA.id }]);
    });
  });

  it("shows an invited member their own row but not the home yet", async () => {
    await withRollback(db, async (tx) => {
      const { homeA } = await twoHomes(tx);
      const carol = await createMember(tx, {
        homeId: homeA.id,
        phone: nextPhone(),
        status: "invited",
      });
      await actAs(tx, carol.userId);

      expect(await tx.select().from(homes)).toEqual([]);
      expect(await tx.select().from(messages)).toEqual([]);
      expect(await tx.select({ id: members.id }).from(members)).toEqual([
        { id: carol.id },
      ]);
    });
  });

  it("gives signed-out visitors no access at all", async () => {
    await withRollback(db, async (tx) => {
      await twoHomes(tx);
      await actAsAnon(tx);

      for (const table of [
        homes,
        members,
        conversations,
        messages,
        waitlistSignups,
      ]) {
        await expectDbError(
          tx,
          (sp) => sp.select().from(table),
          /permission denied/,
        );
      }
    });
  });

  it("doesn't let signed-in members write anything", async () => {
    await withRollback(db, async (tx) => {
      const { homeA, alice } = await twoHomes(tx);
      await actAs(tx, alice.userId);

      await expectDbError(
        tx,
        (sp) =>
          sp.insert(messages).values({
            homeId: homeA.id,
            direction: "inbound",
            channel: "web",
            author: "member",
            deliveryStatus: "received",
          }),
        /permission denied/,
      );
      await expectDbError(
        tx,
        (sp) =>
          sp
            .update(homes)
            .set({ name: "Renamed" })
            .where(eq(homes.id, homeA.id)),
        /permission denied/,
      );
      await expectDbError(
        tx,
        (sp) =>
          sp.delete(conversations).where(eq(conversations.homeId, homeA.id)),
        /permission denied/,
      );
    });
  });

  it("keeps costs and alerts staff-only", async () => {
    await withRollback(db, async (tx) => {
      const { homeA, alice } = await twoHomes(tx);
      const staff = await createMember(tx, {
        homeId: null,
        phone: nextPhone(),
        role: "staff",
      });
      const cost = one(
        await tx
          .insert(usageCosts)
          .values({
            homeId: homeA.id,
            memberId: alice.id,
            kind: "twilio",
            amountUsd: "0.0079",
            refType: "message",
            refId: `SM${randomUUID()}`,
            occurredAt: new Date(),
          })
          .returning(),
      );
      const alert = one(
        await tx
          .insert(alerts)
          .values({
            kind: "member_over_budget",
            memberId: alice.id,
            dedupeKey: `test:${randomUUID()}`,
          })
          .returning(),
      );

      await tx.transaction(async (sp) => {
        await actAs(sp, alice.userId);
        expect(await sp.select().from(usageCosts)).toEqual([]);
        expect(await sp.select().from(alerts)).toEqual([]);
      });

      await actAs(tx, staff.userId);
      const costIds = (
        await tx.select({ id: usageCosts.id }).from(usageCosts)
      ).map((row) => row.id);
      const alertIds = (await tx.select({ id: alerts.id }).from(alerts)).map(
        (row) => row.id,
      );
      expect(costIds).toContain(cost.id);
      expect(alertIds).toContain(alert.id);
    });
  });

  it("keeps the waitlist staff-only", async () => {
    await withRollback(db, async (tx) => {
      const { alice } = await twoHomes(tx);
      const staff = await createMember(tx, {
        homeId: null,
        phone: nextPhone(),
        role: "staff",
      });
      const signup = one(
        await tx
          .insert(waitlistSignups)
          .values({ email: `someone-${randomUUID()}@example.com` })
          .returning(),
      );

      // A waitlist address belongs to someone who isn't a member and has no
      // home, so there is no member who should ever see one.
      await tx.transaction(async (sp) => {
        await actAs(sp, alice.userId);
        expect(await sp.select().from(waitlistSignups)).toEqual([]);
      });

      await actAs(tx, staff.userId);
      const ids = (
        await tx.select({ id: waitlistSignups.id }).from(waitlistSignups)
      ).map((row) => row.id);
      expect(ids).toContain(signup.id);
    });
  });

  it("lets staff read every home, including texts from unknown numbers", async () => {
    await withRollback(db, async (tx) => {
      const { homeA, homeB, alice } = await twoHomes(tx);
      const staff = await createMember(tx, {
        homeId: null,
        phone: nextPhone(),
        role: "staff",
      });
      const stranger = one(
        await tx
          .insert(messages)
          .values({
            direction: "inbound",
            channel: "sms",
            author: "member",
            body: "Who is this?",
            fromPhone: "+15550199999",
            deliveryStatus: "received",
          })
          .returning(),
      );

      await tx.transaction(async (sp) => {
        await actAs(sp, alice.userId);
        const visible = await sp
          .select({ id: messages.id })
          .from(messages)
          .where(eq(messages.id, stranger.id));
        expect(visible).toEqual([]);
      });

      await actAs(tx, staff.userId);
      const homeIds = (
        await tx
          .select({ id: homes.id })
          .from(homes)
          .where(inArray(homes.id, [homeA.id, homeB.id]))
      ).map((row) => row.id);
      expect(homeIds.sort()).toEqual([homeA.id, homeB.id].sort());
      expect(
        await tx
          .select({ id: messages.id })
          .from(messages)
          .where(eq(messages.id, stranger.id)),
      ).toEqual([{ id: stranger.id }]);
    });
  });
});

describe("data integrity", () => {
  it("keeps the activity log append-only, even for the server", async () => {
    await withRollback(db, async (tx) => {
      const event = one(
        await tx
          .insert(activityEvents)
          .values({
            entityType: "home",
            entityId: randomUUID(),
            action: "created",
            actorType: "system",
            sourceType: "system",
          })
          .returning(),
      );

      await expectDbError(
        tx,
        (sp) =>
          sp
            .update(activityEvents)
            .set({ action: "edited" })
            .where(eq(activityEvents.id, event.id)),
        /append-only/,
      );
      await expectDbError(
        tx,
        (sp) =>
          sp.delete(activityEvents).where(eq(activityEvents.id, event.id)),
        /append-only/,
      );
    });
  });

  it("caps the pilot at 10 members, not counting removed members or staff", async () => {
    await withRollback(db, async (tx) => {
      const existing = await tx
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.role, "member"),
            inArray(members.status, ["invited", "active"]),
          ),
        );
      const home = await createHome(tx, "Cap test");
      const room = 10 - existing.length;
      for (let i = 0; i < room; i++) {
        await createMember(tx, {
          homeId: home.id,
          phone: nextPhone(),
          status: i % 2 === 0 ? "active" : "invited",
        });
      }
      const removed = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
        status: "removed",
      });
      await createMember(tx, {
        homeId: null,
        phone: nextPhone(),
        role: "staff",
      });

      await expectDbError(
        tx,
        (sp) => createMember(sp, { homeId: home.id, phone: nextPhone() }),
        /limited to 10 members/,
      );
      await expectDbError(
        tx,
        (sp) =>
          sp
            .update(members)
            .set({ status: "active" })
            .where(eq(members.id, removed.id)),
        /limited to 10 members/,
      );
    });
  });

  it("requires E.164 phone numbers", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx);
      await expectDbError(
        tx,
        (sp) => createMember(sp, { homeId: home.id, phone: "5551234567" }),
        /members_phone_e164/,
      );
    });
  });

  it("requires a home for everyone except staff", async () => {
    await withRollback(db, async (tx) => {
      await expectDbError(
        tx,
        (sp) => createMember(sp, { homeId: null, phone: nextPhone() }),
        /members_home_required/,
      );
    });
  });
});
