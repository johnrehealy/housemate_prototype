import { describe, expect, it } from "vitest";
import { readSignInIdentifier } from "./sign-in-identifier";

describe("readSignInIdentifier", () => {
  it("reads anything with an @ as an email, normalized", () => {
    expect(readSignInIdentifier("  Sam@Example.com ")).toEqual({
      kind: "email",
      email: "sam@example.com",
    });
  });

  it("reads anything else as a US mobile number", () => {
    expect(readSignInIdentifier("(555) 019-0001")).toEqual({
      kind: "phone",
      phone: "+15550190001",
    });
    expect(readSignInIdentifier("+1 555 019 0001")).toEqual({
      kind: "phone",
      phone: "+15550190001",
    });
  });

  it("is null for something that's neither", () => {
    for (const input of ["", "sam@", "sam@example", "555-0190", "sam"]) {
      expect(readSignInIdentifier(input), input).toBeNull();
    }
  });
});
