import { describe, expect, it } from "vitest";
import { MONTHLY_BUDGET_USD } from "../config";
import { costLookupDelaySeconds } from "../queue/jobs";
import { stuckSendText } from "../jobs/sweep-stuck-sends";
import { overBudgetText } from "./check-pilot-budget";

/** The words the team is texted, and the timing of a price lookup (D-060). */

describe("the over-budget text", () => {
  it("names the month, the total and the budget", () => {
    expect(overBudgetText("2026-09", 104.321)).toBe(
      "Housemate alert: costs for September are $104.32, over the $100 budget. Nothing is blocked.",
    );
    expect(MONTHLY_BUDGET_USD).toBe(100);
  });
});

describe("the stuck-send text", () => {
  it("names the text, the number and how long it's been", () => {
    expect(
      stuckSendText("3f9a2b1c-0000-4000-8000-000000000000", "+15550190001", 17),
    ).toBe(
      "Housemate alert: a text from 17 minutes ago still has no delivery result. Message 3f9a2b, to (555) 019-0001. It may not have gone out.",
    );
  });

  it("leaves the number out when there isn't one", () => {
    expect(
      stuckSendText("abc123de-0000-4000-8000-000000000000", null, 20),
    ).toBe(
      "Housemate alert: a text from 20 minutes ago still has no delivery result. Message abc123. It may not have gone out.",
    );
  });
});

describe("when a price is looked up", () => {
  it("waits for Twilio and not for the simulator", () => {
    // Twilio fills a message's price in after it handles it.
    expect(costLookupDelaySeconds("twilio")).toBe(60);
    expect(costLookupDelaySeconds("simulator")).toBe(0);
  });
});
