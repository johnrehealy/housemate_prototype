import { z } from "zod";

export const APP_ENVS = ["local", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const e164Phone = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Must be an E.164 phone number");

const phoneList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((phone) => phone.trim())
      .filter(Boolean),
  )
  .pipe(z.array(e164Phone));

// Blank values in .env files count as unset.
const optionalString = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const TWILIO_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID",
] as const;

export const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    PUBLIC_BASE_URL: z.url(),
    DATABASE_URL: z.url(),
    SMS_PROVIDER: z.enum(["simulator", "twilio"]),
    TWILIO_ACCOUNT_SID: optionalString,
    TWILIO_AUTH_TOKEN: optionalString,
    TWILIO_MESSAGING_SERVICE_SID: optionalString,
    TWILIO_PHONE_NUMBER: optionalString.pipe(e164Phone.optional()),
    /** Supabase project URL and secret key, used to create sign-in accounts. */
    SUPABASE_URL: optionalString.pipe(z.url().optional()),
    SUPABASE_SECRET_KEY: optionalString,
    ACK_REPLY_ENABLED: booleanString.default(false),
    TEAM_ALERT_PHONES: phoneList,
    /**
     * The Apps Script that emails the owner and adds a row to their Google
     * Sheet for each new waitlist signup (`scripts/waitlist-alerts`). Set in
     * production only; unset, the alert is off.
     */
    WAITLIST_ALERT_URL: optionalString.pipe(z.url().optional()),
    WAITLIST_ALERT_SECRET: optionalString.pipe(
      z.string().min(32, "Must be at least 32 characters").optional(),
    ),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production" && env.ACK_REPLY_ENABLED) {
      ctx.addIssue({
        code: "custom",
        message: "Must be false in production",
        path: ["ACK_REPLY_ENABLED"],
      });
    }
    if (env.APP_ENV === "production" && env.SMS_PROVIDER === "simulator") {
      ctx.addIssue({
        code: "custom",
        message: "The simulator can't be used in production",
        path: ["SMS_PROVIDER"],
      });
    }
    if (env.APP_ENV !== "local") {
      for (const key of ["SUPABASE_URL", "SUPABASE_SECRET_KEY"] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            message: "Required outside local development",
            path: [key],
          });
        }
      }
    }
    const alertKeys = ["WAITLIST_ALERT_URL", "WAITLIST_ALERT_SECRET"] as const;
    const alertSet = alertKeys.filter((key) => env[key]);
    if (alertSet.length === 1) {
      for (const key of alertKeys) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            message:
              "Set WAITLIST_ALERT_URL and WAITLIST_ALERT_SECRET together",
            path: [key],
          });
        }
      }
    }
    // The secret travels in the request body, so only a local stub may see it
    // over plain http.
    if (
      env.APP_ENV !== "local" &&
      env.WAITLIST_ALERT_URL &&
      !env.WAITLIST_ALERT_URL.startsWith("https://")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Must be https outside local development",
        path: ["WAITLIST_ALERT_URL"],
      });
    }
    if (env.SMS_PROVIDER === "twilio") {
      for (const key of TWILIO_KEYS) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            message: "Required when SMS_PROVIDER is twilio",
            path: [key],
          });
        }
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Parses server-side environment variables, failing fast with a readable message. */
export function loadServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
