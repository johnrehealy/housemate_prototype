import { z } from "zod";
import type { ActionContext } from "../actions/context";
import { ActionError } from "../actions/errors";
import {
  recordInboundMessage,
  recordInboundMessageInput,
} from "../actions/record-inbound-message";
import {
  updateMessageStatus,
  updateMessageStatusInput,
} from "../actions/update-message-status";
import { isValidTwilioSignature } from "./signature";

/**
 * Twilio's two webhooks, as channel-neutral handlers. The web app's routes are
 * thin glue around these, and the local simulator posts to the same routes, so
 * a simulated text runs exactly the code a real one does (D-009).
 *
 * Nothing here logs a message's body, phone numbers or media: a text can hold
 * an alarm code (invariant 6). Logs carry the MessageSid and the outcome only.
 */

export type WebhookRequest = {
  ctx: ActionContext;
  authToken: string;
  /** Value of the X-Twilio-Signature header. */
  signature: string | null;
  /** The public URL Twilio signed: PUBLIC_BASE_URL plus path and query. */
  url: string;
  /** The form-encoded POST parameters. */
  params: Record<string, string>;
};

export type WebhookResponse = {
  status: number;
  body: string;
  contentType?: string;
};

/** Empty TwiML: stored, and Twilio sends no reply of its own. */
const EMPTY_TWIML: WebhookResponse = {
  status: 200,
  body: '<?xml version="1.0" encoding="UTF-8"?><Response/>',
  contentType: "text/xml",
};
const OK: WebhookResponse = { status: 200, body: "" };
const BAD_REQUEST: WebhookResponse = { status: 400, body: "" };
const FORBIDDEN: WebhookResponse = { status: 403, body: "" };
const SERVER_ERROR: WebhookResponse = { status: 500, body: "" };

export type InboundSms = z.input<typeof recordInboundMessageInput>;

const mediaUrl = z.url();

/**
 * Twilio's default opt-out and help keywords. Twilio matches the whole text,
 * ignoring case, and answers these itself (D-051). START, YES and UNSTOP are
 * left out on purpose: a member's "Yes" must always reach the agent.
 */
const OPT_OUT_KEYWORDS: Record<string, "stop" | "help"> = {
  STOP: "stop",
  STOPALL: "stop",
  UNSUBSCRIBE: "stop",
  CANCEL: "stop",
  END: "stop",
  QUIT: "stop",
  HELP: "help",
  INFO: "help",
};

/**
 * Whether Twilio treated this text as STOP or HELP. Twilio says so in
 * OptOutType when Advanced Opt-Out is on; otherwise the text is matched
 * against its default keywords, so the answer is the same either way.
 */
export function optOutOf(
  params: Record<string, string>,
): "stop" | "help" | undefined {
  const type = params.OptOutType?.trim().toUpperCase();
  if (type === "STOP") return "stop";
  if (type === "HELP") return "help";
  if (type) return undefined; // START: an ordinary text.
  return OPT_OUT_KEYWORDS[(params.Body ?? "").trim().toUpperCase()];
}

/**
 * Reads Twilio's inbound parameters. Null when the text can't be stored: no
 * MessageSid, or a sender or recipient that isn't an E.164 number. A media
 * item missing its URL is skipped rather than losing the whole text.
 */
export function parseInboundSms(
  params: Record<string, string>,
): InboundSms | null {
  const count = Number.parseInt(params.NumMedia ?? "0", 10);
  const media = Array.from(
    { length: Number.isFinite(count) && count > 0 ? count : 0 },
    (_, index) => ({
      url: params[`MediaUrl${index}`] ?? "",
      contentType:
        params[`MediaContentType${index}`] || "application/octet-stream",
    }),
  ).filter((item) => mediaUrl.safeParse(item.url).success);

  const input: InboundSms = {
    providerSid: params.MessageSid ?? "",
    fromPhone: params.From ?? "",
    toPhone: params.To ?? "",
    body: params.Body ?? "",
    media,
    optOut: optOutOf(params),
  };
  return recordInboundMessageInput.safeParse(input).success ? input : null;
}

type StoredStatus = z.infer<typeof updateMessageStatusInput>["status"];

/** Twilio's MessageStatus values, and what each is stored as. */
const TWILIO_STATUSES: Record<string, StoredStatus> = {
  accepted: "queued",
  scheduled: "queued",
  queued: "queued",
  sending: "queued",
  sent: "sent",
  delivered: "delivered",
  read: "delivered",
  undelivered: "undelivered",
  failed: "failed",
  canceled: "failed",
};

/**
 * Reads a status callback. Null when there's nothing to store: no MessageSid,
 * or a status that isn't a delivery update.
 */
export function parseStatusCallback(
  params: Record<string, string>,
): { providerSid: string; status: StoredStatus } | null {
  const providerSid = params.MessageSid;
  const status = TWILIO_STATUSES[params.MessageStatus ?? ""];
  if (!providerSid || !status) return null;
  return { providerSid, status };
}

/** A text arrives: check it came from Twilio, then store it. */
export async function handleInboundWebhook(
  request: WebhookRequest,
): Promise<WebhookResponse> {
  if (!isValidTwilioSignature(request)) return FORBIDDEN;

  const input = parseInboundSms(request.params);
  if (!input) {
    logWebhook("inbound", request.params.MessageSid, "malformed");
    return BAD_REQUEST;
  }

  try {
    await recordInboundMessage(request.ctx, input);
    return EMPTY_TWIML;
  } catch (error) {
    // 5xx sends Twilio to the fallback URL, and shows in its debugger.
    logWebhook("inbound", input.providerSid, "failed", error);
    return SERVER_ERROR;
  }
}

/** A delivery update for a text Housemate sent. */
export async function handleStatusWebhook(
  request: WebhookRequest,
): Promise<WebhookResponse> {
  if (!isValidTwilioSignature(request)) return FORBIDDEN;

  const update = parseStatusCallback(request.params);
  if (!update) return OK;

  try {
    await updateMessageStatus(request.ctx, update);
    return OK;
  } catch (error) {
    // A text we have no record of can't be fixed by a retry.
    if (error instanceof ActionError && error.code === "not_found") return OK;
    logWebhook("status", update.providerSid, "failed", error);
    return SERVER_ERROR;
  }
}

/**
 * The only webhook logging there is. The error's message is left out on
 * purpose: database errors can quote the values they were given.
 */
function logWebhook(
  webhook: "inbound" | "status",
  messageSid: string | undefined,
  outcome: "malformed" | "failed",
  error?: unknown,
) {
  const detail =
    error instanceof Error
      ? {
          error: error.name,
          code: (error as { code?: unknown }).code ?? null,
        }
      : {};
  console.error(`Twilio ${webhook} webhook ${outcome}`, {
    messageSid: messageSid ?? null,
    ...detail,
  });
}
