import { z } from "zod";
import { toEmail } from "../email";

export const e164Phone = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Must be an E.164 phone number");

export const ianaTimezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Must be an IANA timezone, such as America/New_York");

/**
 * An email address, normalized. It defers to `toEmail` rather than carrying a
 * second pattern, so the landing page and the action can't disagree about what
 * counts as an address.
 */
export const emailAddress = z.string().transform((value, ctx) => {
  const email = toEmail(value);
  if (!email) {
    ctx.addIssue({ code: "custom", message: "Must be an email address" });
    return z.NEVER;
  }
  return email;
});
