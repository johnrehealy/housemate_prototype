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

/** What a message cost, once the provider has worked it out. */
export type MessagePrice = {
  /** Always positive, in US dollars. */
  amountUsd: number;
};

/** Sends texts: Twilio in staging and production, the simulator locally and in tests. */
export interface SmsProvider {
  readonly name: "twilio" | "simulator";
  send(message: OutboundSms): Promise<SendResult>;
  /**
   * What the provider charged for a message, or null while it hasn't priced it
   * yet. Twilio fills the price in some time after it handles the message, so
   * a null here means "ask again", not "free".
   */
  priceOf(providerSid: string): Promise<MessagePrice | null>;
}
