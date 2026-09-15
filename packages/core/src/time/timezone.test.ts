import { describe, expect, it } from "vitest";
import {
  hourInTimezone,
  isWithinQuietHours,
  monthKeyInTimezone,
  startOfMonthInTimezone,
} from "./timezone";

const NY = "America/New_York";

describe("hourInTimezone", () => {
  it("converts UTC to the home's local hour", () => {
    // 2026-09-15 01:30 UTC is 21:30 the previous evening in New York.
    expect(hourInTimezone(new Date("2026-09-15T01:30:00Z"), NY)).toBe(21);
  });

  it("reports midnight as hour 0", () => {
    expect(hourInTimezone(new Date("2026-09-15T04:00:00Z"), NY)).toBe(0);
  });

  it("rejects an unknown timezone", () => {
    expect(() => hourInTimezone(new Date(), "Mars/Olympus")).toThrow();
  });
});

describe("isWithinQuietHours", () => {
  it.each([
    ["9 PM local", "2026-09-15T01:00:00Z", false],
    ["10 PM local", "2026-09-15T02:00:00Z", true],
    ["3 AM local", "2026-09-15T07:00:00Z", true],
    ["7:59 AM local", "2026-09-15T11:59:00Z", true],
    ["8 AM local", "2026-09-15T12:00:00Z", false],
    ["2 PM local", "2026-09-15T18:00:00Z", false],
  ])("%s", (_label, iso, expected) => {
    expect(isWithinQuietHours(new Date(iso), NY)).toBe(expected);
  });

  it("uses the home's timezone, not the server's", () => {
    const at = new Date("2026-09-15T02:00:00Z"); // 10 PM in New York
    expect(isWithinQuietHours(at, NY)).toBe(true);
    expect(isWithinQuietHours(at, "Europe/Dublin")).toBe(true); // 3 AM
    expect(isWithinQuietHours(at, "Asia/Tokyo")).toBe(false); // 11 AM
  });
});

describe("month boundaries", () => {
  it("uses the local month, not the UTC month", () => {
    // 2026-10-01 02:00 UTC is still 30 September in New York.
    const at = new Date("2026-10-01T02:00:00Z");
    expect(monthKeyInTimezone(at, NY)).toBe("2026-09");
    expect(monthKeyInTimezone(at, "UTC")).toBe("2026-10");
  });

  it("finds the instant the local month starts", () => {
    const at = new Date("2026-09-15T12:00:00Z");
    // September starts at 00:00 New York time, which is 04:00 UTC.
    expect(startOfMonthInTimezone(at, NY).toISOString()).toBe(
      "2026-09-01T04:00:00.000Z",
    );
    expect(startOfMonthInTimezone(at, "UTC").toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("handles a month that starts during daylight saving time", () => {
    // November 2026 starts before the US clocks change, so New York is -04:00.
    const at = new Date("2026-11-15T12:00:00Z");
    expect(startOfMonthInTimezone(at, NY).toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    );
  });
});
