import "server-only";
import type { WebhookRequest, WebhookResponse } from "@housemate/core";
import { actionContext, serverEnv } from "@/lib/server-context";

/**
 * Glue between a Next route and the Twilio webhook handlers in
 * `@housemate/core`, which do the work.
 *
 * The signature is checked against PUBLIC_BASE_URL rather than request.url:
 * behind Vercel's proxy, the URL the app sees may not be the one Twilio signed.
 */
export async function readTwilioRequest(
  request: Request,
): Promise<WebhookRequest> {
  const env = serverEnv();
  const { pathname, search } = new URL(request.url);

  const params: Record<string, string> = {};
  // A body that isn't a form reads as no params, so it fails the signature
  // check with a 403 rather than a 500.
  const form = await request.formData().catch(() => new FormData());
  for (const [key, value] of form) {
    if (typeof value === "string") params[key] = value;
  }

  return {
    ctx: actionContext({ actor: { type: "system" }, source: { type: "sms" } }),
    authToken: env.TWILIO_AUTH_TOKEN,
    signature: request.headers.get("x-twilio-signature"),
    url: new URL(pathname + search, env.PUBLIC_BASE_URL).toString(),
    params,
  };
}

export function toResponse({ status, body, contentType }: WebhookResponse) {
  return new Response(body || null, {
    status,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });
}
