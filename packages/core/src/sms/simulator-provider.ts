import { randomUUID } from "node:crypto";
import type { OutboundSms, SendResult, SmsProvider } from "./types";

/**
 * What the simulator says every text cost. An obviously fake stand-in for
 * Twilio's price, so cost tracking runs locally and in tests.
 */
export const SIMULATED_MESSAGE_PRICE_USD = 0.0079;

export type SimulatorProvider = SmsProvider & {
  /** Texts sent so far, oldest first. */
  readonly sent: ReadonlyArray<OutboundSms & SendResult>;
};

/** Records texts instead of sending them. Used locally and in tests. */
export function createSimulatorProvider(): SimulatorProvider {
  const sent: Array<OutboundSms & SendResult> = [];
  return {
    name: "simulator",
    sent,
    async send(message) {
      const result = { providerSid: `SIM${randomUUID().replaceAll("-", "")}` };
      sent.push({ ...message, ...result });
      return result;
    },

    async priceOf() {
      return { amountUsd: SIMULATED_MESSAGE_PRICE_USD };
    },
  };
}
