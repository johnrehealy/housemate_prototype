import { handleStatusWebhook } from "@housemate/core";
import { readTwilioRequest, toResponse } from "@/lib/twilio-webhook";

/** Twilio posts delivery updates for the texts Housemate sends here. */
export async function POST(request: Request) {
  return toResponse(
    await handleStatusWebhook(await readTwilioRequest(request)),
  );
}
