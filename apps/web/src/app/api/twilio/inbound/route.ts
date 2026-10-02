import { handleInboundWebhook } from "@housemate/core";
import { readTwilioRequest, toResponse } from "@/lib/twilio-webhook";

/** Twilio posts each text a member sends here (and so does the simulator). */
export async function POST(request: Request) {
  return toResponse(
    await handleInboundWebhook(await readTwilioRequest(request)),
  );
}
