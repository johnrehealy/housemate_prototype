"use server";

import {
  SIMULATOR_HOUSEMATE_NUMBER,
  simulateInboundSms,
} from "@housemate/core";
import { toE164 } from "@housemate/core/phone";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { serverEnv } from "@/lib/server-context";
import type { SimulatorState } from "./simulator-form";

/**
 * Sends a simulated text through the real inbound webhook, signed the way
 * Twilio signs it (D-009). Nothing goes to Twilio.
 */
export async function sendSimulatedText(
  _previous: SimulatorState,
  formData: FormData,
): Promise<SimulatorState> {
  const env = serverEnv();
  if (env.APP_ENV === "production") notFound();
  await requireMember();

  const from = toE164(String(formData.get("from") ?? ""));
  const body = String(formData.get("body") ?? "").trim();
  if (!from)
    return { error: "Enter a 10-digit US number, or one starting with +." };
  if (!body) return { error: "Enter a message." };

  const { status } = await simulateInboundSms({
    baseUrl: env.PUBLIC_BASE_URL,
    authToken: env.TWILIO_AUTH_TOKEN,
    from,
    to: env.TWILIO_PHONE_NUMBER ?? SIMULATOR_HOUSEMATE_NUMBER,
    body,
    protectionBypass: env.VERCEL_AUTOMATION_BYPASS_SECRET,
  });
  if (status !== 200) {
    return { error: `The inbound webhook answered ${status}, not 200.` };
  }

  redirect(`/dev/sms?from=${encodeURIComponent(from)}`);
}
