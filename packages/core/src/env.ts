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
  "TWILIO_MESSAGING_SERVICE_SID",
] as const;

export const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    PUBLIC_BASE_URL: z.url(),
    DATABASE_URL: z.url(),
    SMS_PROVIDER: z.enum(["simulator", "twilio"]),
    TWILIO_ACCOUNT_SID: optionalString,
    /**
     * Required everywhere: the Twilio webhooks check every request against it,
     * and the simulator signs with it. Locally it's a fake value.
     */
    TWILIO_AUTH_TOKEN: z
      .string({ error: "Required: the Twilio webhooks are checked against it" })
      .trim()
      .min(1, "Required: the Twilio webhooks are checked against it"),
    TWILIO_MESSAGING_SERVICE_SID: optionalString,
    TWILIO_PHONE_NUMBER: optionalString.pipe(e164Phone.optional()),
    /** Supabase project URL and secret key, used to create sign-in accounts. */
    SUPABASE_URL: optionalString.pipe(z.url().optional()),
    SUPABASE_SECRET_KEY: optionalString,
    ACK_REPLY_ENABLED: booleanString.default(false),
    TEAM_ALERT_PHONES: phoneList,
    /**
     * Set by Vercel when the project's Protection Bypass for Automation is on.
     * The SMS simulator sends it, so its request to the app's own webhook gets
     * past a preview's Vercel Authentication.
     */
    VERCEL_AUTOMATION_BYPASS_SECRET: optionalString,
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

type EnvSource = Record<string, string | undefined>;

/**
 * A Vercel preview has no fixed address, so unless PUBLIC_BASE_URL is set it
 * is the deployment's own. The SMS simulator posts there, and the webhook
 * checks the signature against the same address.
 */
function withPreviewBaseUrl(source: EnvSource): EnvSource {
  if (source.PUBLIC_BASE_URL?.trim()) return source;
  if (source.VERCEL_ENV !== "preview" || !source.VERCEL_URL) return source;
  return { ...source, PUBLIC_BASE_URL: `https://${source.VERCEL_URL}` };
}

/** Parses server-side environment variables, failing fast with a readable message. */
export function loadServerEnv(source: EnvSource = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(withPreviewBaseUrl(source));
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
