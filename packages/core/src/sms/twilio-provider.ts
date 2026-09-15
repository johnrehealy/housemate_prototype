import twilio from "twilio";
import type { SmsProvider } from "./types";

export type TwilioProviderConfig = {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
  /** Where Twilio posts delivery status and price updates. */
  statusCallbackUrl: string;
};

export type TwilioMessagesClient = Pick<twilio.Twilio, "messages">;

/** Sends texts through a Twilio Messaging Service. */
export function createTwilioProvider(
  config: TwilioProviderConfig,
  client: TwilioMessagesClient = twilio(config.accountSid, config.authToken),
): SmsProvider {
  return {
    name: "twilio",
    async send({ to, body, mediaUrls }) {
      const message = await client.messages.create({
        to,
        body,
        messagingServiceSid: config.messagingServiceSid,
        statusCallback: config.statusCallbackUrl,
        ...(mediaUrls?.length ? { mediaUrl: mediaUrls } : {}),
      });
      return { providerSid: message.sid };
    },
  };
}
