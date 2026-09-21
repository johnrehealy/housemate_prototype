import { describe, expect, it } from "vitest";
import { formatUsPhone, toE164 } from "./phone";

describe("toE164", () => {
  it("accepts the ways someone types a US number", () => {
    for (const input of [
      "(555) 019-0001",
      "555-019-0001",
      "555 019 0001",
      "5550190001",
      "15550190001",
      "1 (555) 019-0001",
      "+1 555 019 0001",
      "  (555) 019-0001  ",
    ]) {
      expect(toE164(input), input).toBe("+15550190001");
    }
  });

  it("keeps a number that is already E.164", () => {
    expect(toE164("+15550190001")).toBe("+15550190001");
    expect(toE164("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("refuses anything that isn't a phone number", () => {
    for (const input of [
      "",
      "   ",
      "12345",
      "abc",
      "555-019-000",
      "25550190001",
      "+0155501900",
      "+1",
    ]) {
      expect(toE164(input), input).toBeNull();
    }
  });
});

describe("formatUsPhone", () => {
  it("writes a US number the way a member would", () => {
    expect(formatUsPhone("+15550190001")).toBe("(555) 019-0001");
    expect(formatUsPhone("+12125550123")).toBe("(212) 555-0123");
  });

  it("returns anything else unchanged", () => {
    for (const input of ["+442079460958", "+1555019000", "", "not a number"]) {
      expect(formatUsPhone(input), input).toBe(input);
    }
  });
});
