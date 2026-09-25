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

    async priceOf(providerSid) {
      const message = await client.messages(providerSid).fetch();
      // Twilio fills the price in after it handles the message.
      if (message.price === null || message.price === undefined) return null;
      if (message.priceUnit && message.priceUnit.toUpperCase() !== "USD") {
        throw new Error(
          `Twilio priced a message in ${message.priceUnit}; only USD is recorded.`,
        );
      }
      // Twilio reports what it charged as a negative number.
      const amountUsd = Math.abs(Number(message.price));
      if (!Number.isFinite(amountUsd)) {
        throw new Error("Twilio returned a price that isn't a number.");
      }
      return { amountUsd };
    },
  };
}
