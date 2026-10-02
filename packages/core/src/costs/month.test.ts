import { describe, expect, it } from "vitest";
import {
  formatRaisedAt,
  monthLabel,
  monthLastDay,
  monthOf,
  monthRange,
  nextMonthStart,
  parseMonth,
  shiftMonth,
} from "./month";

describe("budget months", () => {
  it("accepts only well-formed months", () => {
    expect(parseMonth("2026-09")).toBe("2026-09");
    for (const bad of [
      "2026-9",
      "2026-13",
      "2026-00",
      "26-09",
      "",
      undefined,
      ["2026-09"],
    ]) {
      expect(parseMonth(bad)).toBeNull();
    }
  });

  it("runs from midnight UTC on the 1st to the next 1st", () => {
    expect(monthRange("2026-12")).toEqual({
      from: new Date("2026-12-01T00:00:00Z"),
      to: new Date("2027-01-01T00:00:00Z"),
    });
    expect(monthOf(new Date("2026-09-30T23:59:59Z"))).toBe("2026-09");
    expect(monthOf(new Date("2026-10-01T00:00:00Z"))).toBe("2026-10");
  });

  it("steps across a year boundary", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });

  it("names the month and its edges", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
    expect(nextMonthStart("2026-09")).toBe("1 October");
    expect(nextMonthStart("2026-12")).toBe("1 January");
    expect(monthLastDay("2026-09")).toBe("30 September");
    expect(monthLastDay("2028-02")).toBe("29 February");
  });

  it("writes when an alert was raised the way the board does", () => {
    expect(formatRaisedAt(new Date("2026-09-22T09:12:00Z"))).toBe(
      "22 Sep, 09:12",
    );
    expect(formatRaisedAt(new Date("2026-12-12T00:05:00Z"))).toBe(
      "12 Dec, 00:05",
    );
  });
});
