import { afterEach, describe, expect, it, vi } from "vitest";
import { simulateInboundSms } from "./simulate-inbound";

const text = {
  baseUrl: "https://housemate.example",
  authToken: "local-test-token",
  from: "+15550990001",
  to: "+15550100000",
  body: "Hello",
};

function stubFetch() {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function headersOf(fetch: ReturnType<typeof stubFetch>) {
  const [, init] = fetch.mock.calls[0] as [string, RequestInit];
  return init.headers as Record<string, string>;
}

describe("simulateInboundSms", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts a signed text to the app's inbound webhook", async () => {
    const fetch = stubFetch();
    await simulateInboundSms(text);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://housemate.example/api/twilio/inbound",
    );
    expect(headersOf(fetch)["X-Twilio-Signature"]).toBeTruthy();
    expect(headersOf(fetch)).not.toHaveProperty("x-vercel-protection-bypass");
  });

  it("carries the protection bypass for a protected preview", async () => {
    const fetch = stubFetch();
    await simulateInboundSms({ ...text, protectionBypass: "bypass-value" });
    expect(headersOf(fetch)["x-vercel-protection-bypass"]).toBe("bypass-value");
  });
});
