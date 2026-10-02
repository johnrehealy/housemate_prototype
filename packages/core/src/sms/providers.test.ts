import { describe, expect, it, vi } from "vitest";
import { createSmsProvider } from "./create-provider";
import { createSimulatorProvider } from "./simulator-provider";
import {
  createTwilioProvider,
  type TwilioMessagesClient,
} from "./twilio-provider";
import { loadServerEnv } from "../env";

const config = {
  accountSid: "AC00000000000000000000000000000000",
  authToken: "test-auth-token",
  messagingServiceSid: "MG00000000000000000000000000000000",
  statusCallbackUrl: "https://housemate.test/api/twilio/status",
};

function fakeClient(message: Record<string, unknown> = {}) {
  const create = vi.fn().mockResolvedValue({ sid: "SM123" });
  const fetch = vi.fn().mockResolvedValue(message);
  // twilio's `messages` is both a list (create) and a lookup (messages(sid)).
  const messages = Object.assign(() => ({ fetch }), { create });
  const client = { messages } as unknown as TwilioMessagesClient;
  return { client, create, fetch };
}

describe("simulator provider", () => {
  it("records each text and returns a unique simulator ID", async () => {
    const provider = createSimulatorProvider();
    const first = await provider.send({ to: "+15551234567", body: "One" });
    const second = await provider.send({ to: "+15551234567", body: "Two" });

    expect(first.providerSid).toMatch(/^SIM/);
    expect(first.providerSid).not.toBe(second.providerSid);
    expect(provider.sent.map((text) => text.body)).toEqual(["One", "Two"]);
  });
});

describe("message prices", () => {
  it("the simulator prices every text the same, obviously fake amount", async () => {
    const provider = createSimulatorProvider();
    await expect(provider.priceOf("SIM1")).resolves.toEqual({
      amountUsd: 0.0079,
    });
  });

  it("reads Twilio's price as a positive amount", async () => {
    // Twilio reports what it charged as a negative number.
    const { client, fetch } = fakeClient({
      price: "-0.00790",
      priceUnit: "USD",
    });
    const provider = createTwilioProvider(config, client);

    await expect(provider.priceOf("SM123")).resolves.toEqual({
      amountUsd: 0.0079,
    });
    expect(fetch).toHaveBeenCalled();
  });

  it("answers null while Twilio hasn't priced a text yet", async () => {
    const { client } = fakeClient({ price: null, priceUnit: null });
    const provider = createTwilioProvider(config, client);

    await expect(provider.priceOf("SM123")).resolves.toBeNull();
  });

  it("refuses a price that isn't in dollars", async () => {
    const { client } = fakeClient({ price: "-0.07", priceUnit: "EUR" });
    const provider = createTwilioProvider(config, client);

    await expect(provider.priceOf("SM123")).rejects.toThrow(/only USD/);
  });
});

describe("Twilio provider", () => {
  it("sends through the messaging service with a status callback", async () => {
    const { client, create } = fakeClient();
    const provider = createTwilioProvider(config, client);

    const result = await provider.send({ to: "+15551234567", body: "Hi" });

    expect(result).toEqual({ providerSid: "SM123" });
    expect(create).toHaveBeenCalledWith({
      to: "+15551234567",
      body: "Hi",
      messagingServiceSid: config.messagingServiceSid,
      statusCallback: config.statusCallbackUrl,
    });
  });

  it("attaches media only when there is some", async () => {
    const { client, create } = fakeClient();
    const provider = createTwilioProvider(config, client);

    await provider.send({
      to: "+15551234567",
      body: "Photo",
      mediaUrls: ["https://housemate.test/media/1.jpg"],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaUrl: ["https://housemate.test/media/1.jpg"],
      }),
    );
  });
});

describe("createSmsProvider", () => {
  const baseEnv = {
    APP_ENV: "local",
    PUBLIC_BASE_URL: "http://localhost:3000",
    DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    TWILIO_AUTH_TOKEN: "local-test-token",
  };

  it("uses the simulator when configured", () => {
    const env = loadServerEnv({ ...baseEnv, SMS_PROVIDER: "simulator" });
    expect(createSmsProvider(env).name).toBe("simulator");
  });

  it("uses Twilio when configured", () => {
    const env = loadServerEnv({
      ...baseEnv,
      SMS_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: config.accountSid,
      TWILIO_AUTH_TOKEN: config.authToken,
      TWILIO_MESSAGING_SERVICE_SID: config.messagingServiceSid,
    });
    expect(createSmsProvider(env).name).toBe("twilio");
  });
});
