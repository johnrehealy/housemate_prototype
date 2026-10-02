import { Webhook } from "standardwebhooks";
import { z } from "zod";
import type { Mailer } from "./types";

/*
 * Supabase Auth's Send Email hook (D-073): instead of sending its own email,
 * Supabase posts each one here, signed the Standard Webhooks way, and we send
 * the code through our `Mailer`. Housemate only ever emails sign-in codes, so
 * that's all this sends.
 *
 * Kept apart from the route that serves it so it can be tested without a
 * server. Nothing it returns or logs holds the code or the address.
 */

/** What Supabase signs the hook with: `v1,whsec_` and a base64 key. */
const SECRET_PREFIX = "v1,whsec_";

/** The email types that carry a sign-in code from `signInWithOtp`. */
const CODE_EMAILS = new Set(["magiclink", "email"]);

const payloadSchema = z.object({
  user: z.object({ email: z.string().min(3) }),
  email_data: z.object({
    token: z.string().regex(/^\d{6}$/),
    email_action_type: z.string(),
  }),
});

/** Supabase reads `error.message` from any answer that isn't a 200. */
export type SendEmailHookResponse = {
  status: number;
  body: Record<string, unknown>;
  /** A short code for the log. Never the address or the code. */
  outcome:
    | "sent"
    | "not_configured"
    | "bad_signature"
    | "bad_request"
    | "not_a_code"
    | `mail_failed:${string}`;
};

function refuse(
  status: number,
  outcome: SendEmailHookResponse["outcome"],
  message: string,
): SendEmailHookResponse {
  return {
    status,
    outcome,
    body: { error: { http_code: status, message } },
  };
}

export async function handleSendEmailHook(
  deps: { secret: string | undefined; mailer: Mailer },
  request: { body: string; headers: Record<string, string> },
): Promise<SendEmailHookResponse> {
  if (!deps.secret?.startsWith(SECRET_PREFIX)) {
    return refuse(500, "not_configured", "The email hook isn't set up.");
  }

  let payload: unknown;
  try {
    payload = new Webhook(deps.secret.slice(SECRET_PREFIX.length)).verify(
      request.body,
      request.headers,
    );
  } catch {
    return refuse(401, "bad_signature", "The request isn't signed.");
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return refuse(400, "bad_request", "The request isn't a code email.");
  }
  const { user, email_data: data } = parsed.data;
  if (!CODE_EMAILS.has(data.email_action_type)) {
    return refuse(400, "not_a_code", "Housemate only emails sign-in codes.");
  }

  const result = await deps.mailer.sendCode({
    to: user.email,
    code: data.token,
  });
  if (!result.ok) {
    return refuse(
      500,
      `mail_failed:${result.reason}`,
      "The code couldn't be emailed.",
    );
  }
  return { status: 200, outcome: "sent", body: {} };
}
