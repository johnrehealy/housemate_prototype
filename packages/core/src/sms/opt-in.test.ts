import { describe, expect, it } from "vitest";
import { SMS_OPT_IN } from "./opt-in";

describe("SMS_OPT_IN", () => {
  it("is G3's box, with everything Twilio's reviewers look for in its small print", () => {
    expect(SMS_OPT_IN.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(SMS_OPT_IN.label).toBe("Text me about my home");
    for (const required of [
      "Housemate, operated by John Healy",
      "about your home",
      "Msg frequency varies",
      "Msg & data rates may apply",
      "Reply STOP to opt out",
      "HELP for help",
      "Texting is optional",
    ]) {
      expect(SMS_OPT_IN.smallPrint).toContain(required);
    }
  });
});
