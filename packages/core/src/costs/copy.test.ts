import { describe, expect, it } from "vitest";
import {
  budgetCaption,
  earlierOpenLabel,
  emptyCostsText,
  memberNote,
  periodCaption,
  unreachedNotice,
} from "./copy";
import type { CostReport, CostRow } from "./report";

function report(overrides: Partial<CostReport> = {}): CostReport {
  return {
    month: "2026-09",
    isCurrent: true,
    previousMonth: null,
    nextMonth: null,
    budgetUsd: 100,
    totalUsd: 4.87,
    hasClaude: false,
    members: [],
    outside: null,
    totals: { texts: 0, twilioUsd: 0, claudeUsd: 0, totalUsd: 0 },
    alerts: [],
    alertCount: 0,
    unreached: null,
    earlierOpen: null,
    ...overrides,
  };
}

const outside: CostRow = {
  memberId: null,
  name: "Not a member",
  texts: 25,
  twilioUsd: 0.2,
  claudeUsd: 0,
  totalUsd: 0.2,
};

describe("the budget captions", () => {
  it("give the share of the budget", () => {
    expect(budgetCaption(report())).toBe(
      "5% of the $100 pilot budget. Going over is flagged, never blocked.",
    );
    expect(budgetCaption(report({ totalUsd: 116.76 }))).toBe(
      "117% of the $100 pilot budget. Going over is flagged, never blocked.",
    );
    expect(budgetCaption(report({ totalUsd: 0.2 }))).toMatch(/^Under 1% of/);
  });

  it("say when nothing has been spent", () => {
    expect(budgetCaption(report({ totalUsd: 0, month: "2026-10" }))).toBe(
      "Nothing spent in October yet. Going over is flagged, never blocked.",
    );
    expect(
      budgetCaption(
        report({ totalUsd: 0, month: "2026-08", isCurrent: false }),
      ),
    ).toBe("Nothing spent in August. Going over is flagged, never blocked.");
  });

  it("say when the next budget starts, or when a past month ended", () => {
    expect(periodCaption(report())).toBe("A new budget starts 1 October");
    expect(periodCaption(report({ isCurrent: false }))).toBe(
      "Month ended 30 September",
    );
  });
});

describe("the notices", () => {
  it("match the approved board for one alert the team didn't get", () => {
    expect(unreachedNotice({ count: 1, reason: "failed" })).toBe(
      "One alert didn't reach the team: every text to the team failed. It's first in the list below, and this page is the only place it shows.",
    );
  });

  it("don't claim texts failed when there were no numbers to text", () => {
    expect(unreachedNotice({ count: 2, reason: "no_numbers" })).toBe(
      "2 alerts didn't reach the team: no team numbers are set. They're first in the list below, and this page is the only place they show.",
    );
  });

  it("point back to open alerts from earlier months", () => {
    expect(earlierOpenLabel({ count: 1, months: ["2026-09"] }, "2026-10")).toBe(
      "1 alert from September still needs a look",
    );
    expect(earlierOpenLabel({ count: 2, months: ["2026-12"] }, "2027-01")).toBe(
      "2 alerts from December 2026 still need a look",
    );
    expect(
      earlierOpenLabel({ count: 3, months: ["2026-10", "2026-09"] }, "2026-11"),
    ).toBe("3 alerts from earlier months still need a look");
  });

  it("say what an empty month means", () => {
    expect(emptyCostsText(report({ month: "2026-10" }))).toBe(
      "No costs in October yet. A text shows up here about a minute after it's sent.",
    );
    expect(emptyCostsText(report({ isCurrent: false }))).toBe(
      "No costs in September.",
    );
  });
});

describe("the note under the member table", () => {
  it("explains the single cost column and the not-a-member row", () => {
    expect(memberNote(report({ outside }))).toBe(
      "Every cost so far is a text. Agent runs get their own columns once there are any. “Not a member” is texts to and from numbers outside the pilot.",
    );
    expect(memberNote(report())).toBe(
      "Every cost so far is a text. Agent runs get their own columns once there are any.",
    );
  });

  it("explains the missing Claude cost once agent runs are costed", () => {
    expect(memberNote(report({ hasClaude: true, outside }))).toBe(
      "“Not a member” is texts to and from numbers outside the pilot. They never reach the agent, so they have no Claude cost.",
    );
    expect(memberNote(report({ hasClaude: true }))).toBeNull();
  });
});
