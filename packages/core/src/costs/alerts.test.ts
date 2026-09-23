import { describe, expect, it } from "vitest";
import {
  alertState,
  buildAlertRows,
  describeAlert,
  teamReach,
  type AlertFacts,
} from "./alerts";

const MONTH = "2026-09";

function alert(overrides: Partial<AlertFacts> = {}): AlertFacts {
  return {
    id: crypto.randomUUID(),
    kind: "send_stuck",
    detail: {},
    notifiedAt: new Date("2026-09-18T14:32:05Z"),
    resolvedAt: null,
    createdAt: new Date("2026-09-18T14:32:00Z"),
    teamTexts: 1,
    message: null,
    parked: null,
    ...overrides,
  };
}

function stuck(
  deliveryStatus: NonNullable<AlertFacts["message"]>["deliveryStatus"],
  overrides: Partial<AlertFacts> = {},
): AlertFacts {
  const messageId = crypto.randomUUID();
  return alert({
    kind: "send_stuck",
    detail: { messageId, ageMinutes: 15 },
    message: {
      id: messageId,
      direction: "outbound",
      outboundKind: "reply",
      deliveryStatus,
      memberName: "Dana",
      toTeam: false,
    },
    ...overrides,
  });
}

function parkedPriceLookup(
  parked: boolean,
  overrides: Partial<AlertFacts> = {},
) {
  const messageId = "7c21e4aa-0000-4000-8000-000000000000";
  return alert({
    kind: "worker_error",
    detail: { queue: "message_costs", msgId: "42", attempts: 8 },
    parked,
    message: parked
      ? {
          id: messageId,
          direction: "outbound",
          outboundKind: "reply",
          deliveryStatus: "delivered",
          memberName: "Maya",
          toTeam: false,
        }
      : null,
    ...overrides,
  });
}

describe("an alert's state", () => {
  it("is resolved once a stuck text gets a good result, and not before", () => {
    expect(alertState(stuck("queued"))).toBe("needs_look");
    expect(alertState(stuck("failed"))).toBe("needs_look");
    expect(alertState(stuck("sent"))).toBe("resolved");
    expect(alertState(stuck("delivered"))).toBe("resolved");
  });

  it("needs a look while a failed job is still parked", () => {
    expect(alertState(parkedPriceLookup(true))).toBe("needs_look");
    expect(alertState(parkedPriceLookup(false))).toBe("resolved");
  });

  it("is flagged, not open, for going over budget", () => {
    expect(alertState(alert({ kind: "pilot_over_budget" }))).toBe("flagged");
  });

  it("is resolved whenever someone marked it so", () => {
    const resolvedAt = new Date("2026-09-19T00:00:00Z");
    expect(alertState(stuck("queued", { resolvedAt }))).toBe("resolved");
  });

  it("says why the team wasn't reached", () => {
    expect(teamReach(alert())).toBe("texted");
    expect(teamReach(alert({ notifiedAt: null, teamTexts: 2 }))).toBe("failed");
    expect(teamReach(alert({ notifiedAt: null, teamTexts: 0 }))).toBe(
      "no_numbers",
    );
  });
});

describe("an alert's words", () => {
  it("match the approved board for a parked price lookup", () => {
    expect(describeAlert(parkedPriceLookup(true), MONTH)).toEqual({
      icon: "receipt",
      title:
        "One text's price couldn't be fetched, so September's total is about 1¢ short.",
      detail: "Message 7c21e4 · gave up after 8 tries",
    });
  });

  it("fall back to the job number once the parked job is cleared", () => {
    expect(describeAlert(parkedPriceLookup(false), MONTH).detail).toBe(
      "Job 42 · gave up after 8 tries, since cleared",
    );
  });

  it("name who a stuck reply was to", () => {
    const words = describeAlert(stuck("delivered"), MONTH);
    expect(words.title).toBe(
      "A reply to Dana had no delivery result for 15 minutes.",
    );
    expect(words.detail).toMatch(/^Message [0-9a-f]{6} · delivered since$/);
  });

  it("call the team's own texts the team's", () => {
    const text = stuck("queued");
    if (!text.message) throw new Error("fixture has a message");
    text.message = {
      ...text.message,
      outboundKind: "proactive",
      memberName: null,
      toTeam: true,
    };
    expect(describeAlert(text, MONTH).title).toBe(
      "A text to the team had no delivery result for 15 minutes.",
    );
  });

  it("quote what was spent when the budget was crossed", () => {
    const words = describeAlert(
      alert({
        kind: "pilot_over_budget",
        detail: { month: "2026-12", totalUsd: 100.42, budgetUsd: 100 },
      }),
      "2026-12",
    );
    expect(words).toEqual({
      icon: "wallet",
      title: "Went over the $100 budget. Nothing was blocked.",
      detail: "$100.42 spent at the time",
    });
  });
});

describe("the alerts table", () => {
  it("folds stuck sends from one sweep into one row", () => {
    const at = (seconds: number) =>
      new Date(Date.parse("2026-09-18T14:32:00Z") + seconds * 1000);
    const rows = buildAlertRows(
      [
        stuck("delivered", { createdAt: at(0) }),
        stuck("queued", { createdAt: at(2) }),
        stuck("delivered", { createdAt: at(3) }),
        // The next sweep, five minutes on.
        stuck("delivered", { createdAt: at(300) }),
      ],
      MONTH,
    );

    expect(rows).toHaveLength(2);
    const [open, later] = rows;
    expect(open).toMatchObject({
      count: 3,
      state: "needs_look",
      title: "3 texts had no delivery result for 15 minutes.",
    });
    expect(open?.detail).toMatch(/· 1 still need a look$/);
    expect(later).toMatchObject({ count: 1, state: "resolved" });
  });

  it("puts what the team never heard about first, then by state, newest first", () => {
    const day = (d: number) => new Date(Date.UTC(2026, 8, d, 9));
    const flagged = alert({ kind: "pilot_over_budget", createdAt: day(29) });
    const resolved = stuck("delivered", { createdAt: day(28) });
    const openOld = parkedPriceLookup(true, { createdAt: day(2) });
    const openNew = parkedPriceLookup(true, { createdAt: day(20) });
    const unreached = stuck("delivered", {
      createdAt: day(1),
      notifiedAt: null,
      teamTexts: 1,
    });

    const rows = buildAlertRows(
      [flagged, resolved, openOld, openNew, unreached],
      MONTH,
    );

    expect(rows.map((row) => row.key)).toEqual([
      unreached.id,
      openNew.id,
      openOld.id,
      flagged.id,
      resolved.id,
    ]);
  });
});
