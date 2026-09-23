import { randomUUID } from "node:crypto";
import { signTwilioRequest } from "./signature";

/** Who simulated texts are sent to when no Twilio number is configured. */
export const SIMULATOR_HOUSEMATE_NUMBER = "+15550100000";

export type SimulatedText = {
  /** PUBLIC_BASE_URL: the app whose inbound webhook receives the text. */
  baseUrl: string;
  /** TWILIO_AUTH_TOKEN, so the webhook's signature check passes. */
  authToken: string;
  /** E.164 numbers. */
  from: string;
  to: string;
  body: string;
};

/**
 * Sends a text to Housemate's inbound webhook the way Twilio would: the same
 * parameters, signed the same way, posted over HTTP. Used by the simulator
 * page and CLI, so a simulated text runs the real handler, signature check
 * included (D-009). Nothing goes to Twilio.
 */
export async function simulateInboundSms(
  text: SimulatedText,
): Promise<{ status: number; messageSid: string }> {
  const url = new URL("/api/twilio/inbound", text.baseUrl).toString();
  // "SIM" marks it as simulated in the data, like the simulator's own sends.
  const messageSid = `SIM${randomUUID().replaceAll("-", "")}`;
  const params = {
    MessageSid: messageSid,
    SmsMessageSid: messageSid,
    SmsStatus: "received",
    From: text.from,
    To: text.to,
    Body: text.body,
    NumMedia: "0",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": signTwilioRequest({
        authToken: text.authToken,
        url,
        params,
      }),
    },
    body: new URLSearchParams(params),
  });
  return { status: response.status, messageSid };
}
