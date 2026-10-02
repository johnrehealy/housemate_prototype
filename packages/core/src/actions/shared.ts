import { z } from "zod";
import { US_STATES } from "../address/timezone";
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

/** Blank counts as not given. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

/** A US home address, as Get started collects it (D-072). */
export const homeAddressInput = z.object({
  line1: z.string().trim().min(1).max(200),
  unit: optionalText(50),
  city: z.string().trim().min(1).max(100),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((code) => US_STATES.some((state) => state.code === code), {
      message: "Must be a US state or territory code",
    }),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Must be a ZIP code"),
  /** Set when the address was picked from the search, not typed. */
  placeId: z.string().trim().min(1).max(512).optional(),
});

export type HomeAddressInput = z.input<typeof homeAddressInput>;
