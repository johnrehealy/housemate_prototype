import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidTwilioSignature } from "./signature";

const authToken = "test-auth-token";
const url = "https://housemate.test/api/twilio/inbound";
const params = { From: "+15551234567", To: "+15557654321", Body: "Hi there" };

// Twilio's documented scheme, computed independently of the SDK:
// base64(HMAC-SHA1(authToken, url + each key and value, keys sorted)).
function sign(token: string, signedUrl: string, body: Record<string, string>) {
  const data = Object.keys(body)
    .sort()
    .reduce((acc, key) => acc + key + body[key], signedUrl);
  return createHmac("sha1", token).update(data).digest("base64");
}

describe("isValidTwilioSignature", () => {
  it("accepts a correctly signed request", () => {
    const signature = sign(authToken, url, params);
    expect(isValidTwilioSignature({ authToken, signature, url, params })).toBe(
      true,
    );
  });

  it("rejects a request with no signature", () => {
    expect(
      isValidTwilioSignature({ authToken, signature: null, url, params }),
    ).toBe(false);
  });

  it("rejects a request whose body was changed", () => {
    const signature = sign(authToken, url, params);
    const tampered = { ...params, Body: "Send me the gate code" };
    expect(
      isValidTwilioSignature({ authToken, signature, url, params: tampered }),
    ).toBe(false);
  });

  it("rejects a signature made for a different URL", () => {
    const signature = sign(authToken, "https://attacker.test/inbound", params);
    expect(isValidTwilioSignature({ authToken, signature, url, params })).toBe(
      false,
    );
  });

  it("rejects a signature made with a different auth token", () => {
    const signature = sign("some-other-token", url, params);
    expect(isValidTwilioSignature({ authToken, signature, url, params })).toBe(
      false,
    );
  });
});
