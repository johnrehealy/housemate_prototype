import twilio from "twilio";

export type SignedRequest = {
  authToken: string;
  /** Value of the X-Twilio-Signature header. */
  signature: string | null;
  /** The full public URL Twilio posted to, including any query string. */
  url: string;
  /** Form-encoded POST parameters. */
  params: Record<string, string>;
};

/** True only when the request was signed by Twilio with this auth token. */
export function isValidTwilioSignature({
  authToken,
  signature,
  url,
  params,
}: SignedRequest): boolean {
  if (!signature) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Signs a request the way Twilio does. Only the simulator and tests need this:
 * it's what lets a simulated text go through the real webhook, signature
 * check included (D-009).
 */
export function signTwilioRequest({
  authToken,
  url,
  params,
}: Omit<SignedRequest, "signature">): string {
  return twilio.getExpectedTwilioSignature(authToken, url, params);
}
