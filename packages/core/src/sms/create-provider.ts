import type { ServerEnv } from "../env";
import { createSimulatorProvider } from "./simulator-provider";
import { createTwilioProvider } from "./twilio-provider";
import type { SmsProvider } from "./types";

/** Picks the texting provider for this environment. */
export function createSmsProvider(env: ServerEnv): SmsProvider {
  if (env.SMS_PROVIDER === "simulator") return createSimulatorProvider();

  const {
    TWILIO_ACCOUNT_SID: accountSid,
    TWILIO_AUTH_TOKEN: authToken,
    TWILIO_MESSAGING_SERVICE_SID: messagingServiceSid,
  } = env;
  // loadServerEnv already requires these for Twilio; this narrows the types.
  if (!accountSid || !authToken || !messagingServiceSid) {
    throw new Error("Twilio credentials are missing");
  }

  return createTwilioProvider({
    accountSid,
    authToken,
    messagingServiceSid,
    statusCallbackUrl: new URL(
      "/api/twilio/status",
      env.PUBLIC_BASE_URL,
    ).toString(),
  });
}
