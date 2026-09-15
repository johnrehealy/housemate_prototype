/** A text Housemate sends to a phone. */
export type OutboundSms = {
  /** E.164 phone number. */
  to: string;
  body: string;
  mediaUrls?: string[];
};

export type SendResult = {
  /** The provider's message ID, used to match delivery status callbacks. */
  providerSid: string;
};

/** Sends texts: Twilio in staging and production, the simulator locally and in tests. */
export interface SmsProvider {
  readonly name: "twilio" | "simulator";
  send(message: OutboundSms): Promise<SendResult>;
}
