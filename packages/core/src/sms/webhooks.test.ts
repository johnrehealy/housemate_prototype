import { describe, expect, it } from "vitest";
import type { ActionContext } from "../actions/context";
import { signTwilioRequest } from "./signature";
import {
  handleInboundWebhook,
  handleStatusWebhook,
  optOutOf,
  parseInboundSms,
  parseStatusCallback,
} from "./webhooks";

/** The same params with one left out, as Twilio would send them. */
function without(params: Record<string, string>, key: string) {
  return Object.fromEntries(
    Object.entries(params).filter(([name]) => name !== key),
  );
}

const inbound = {
  MessageSid: "SM0123456789abcdef0123456789abcdef",
  From: "+15550190001",
  To: "+15550100000",
  Body: "The AC stopped working",
  NumMedia: "0",
};

describe("parseInboundSms", () => {
  it("reads a text", () => {
    expect(parseInboundSms(inbound)).toEqual({
      providerSid: inbound.MessageSid,
      fromPhone: inbound.From,
      toPhone: inbound.To,
      body: inbound.Body,
      media: [],
      optOut: undefined,
    });
  });

  it("reads each media item with its content type", () => {
    const parsed = parseInboundSms({
      ...inbound,
      NumMedia: "2",
      MediaUrl0: "https://api.twilio.com/media/one",
      MediaContentType0: "image/jpeg",
      MediaUrl1: "https://api.twilio.com/media/two",
      MediaContentType1: "image/png",
    });
    expect(parsed?.media).toEqual([
      { url: "https://api.twilio.com/media/one", contentType: "image/jpeg" },
      { url: "https://api.twilio.com/media/two", contentType: "image/png" },
    ]);
  });

  it("skips a media item with no URL rather than losing the text", () => {
    const parsed = parseInboundSms({ ...inbound, NumMedia: "1" });
    expect(parsed?.media).toEqual([]);
    expect(parsed?.body).toBe(inbound.Body);
  });

  it("stores a photo-only text with an empty body", () => {
    expect(parseInboundSms(without(inbound, "Body"))?.body).toBe("");
  });

  it("refuses a text with no MessageSid", () => {
    expect(parseInboundSms(without(inbound, "MessageSid"))).toBeNull();
  });

  it("refuses a sender that isn't an E.164 number", () => {
    expect(parseInboundSms({ ...inbound, From: "555-019-0001" })).toBeNull();
  });
});

describe("optOutOf", () => {
  it.each([
    ["STOP", "stop"],
    [" stop ", "stop"],
    ["Unsubscribe", "stop"],
    ["cancel", "stop"],
    ["HELP", "help"],
    ["info", "help"],
  ])("treats %j as %s, the way Twilio does", (body, expected) => {
    expect(optOutOf({ Body: body })).toBe(expected);
  });

  it.each(["Yes", "YES", "start", "Cancel my appointment", "Please stop by"])(
    "treats %j as an ordinary text",
    (body) => {
      expect(optOutOf({ Body: body })).toBeUndefined();
    },
  );

  it("trusts Twilio's OptOutType when it's sent", () => {
    expect(optOutOf({ Body: "arret", OptOutType: "STOP" })).toBe("stop");
    expect(optOutOf({ Body: "HELP", OptOutType: "HELP" })).toBe("help");
    expect(optOutOf({ Body: "START", OptOutType: "START" })).toBeUndefined();
  });

  it("carries the keyword into the stored text", () => {
    expect(parseInboundSms({ ...inbound, Body: "STOP" })?.optOut).toBe("stop");
  });
});

describe("parseStatusCallback", () => {
  const sid = "SM0123456789abcdef0123456789abcdef";

  it.each([
    ["accepted", "queued"],
    ["sending", "queued"],
    ["sent", "sent"],
    ["delivered", "delivered"],
    ["read", "delivered"],
    ["undelivered", "undelivered"],
    ["failed", "failed"],
    ["canceled", "failed"],
  ])("stores Twilio's %s as %s", (twilio, stored) => {
    expect(
      parseStatusCallback({ MessageSid: sid, MessageStatus: twilio }),
    ).toEqual({ providerSid: sid, status: stored });
  });

  it("ignores a status that isn't a delivery update", () => {
    expect(
      parseStatusCallback({ MessageSid: sid, MessageStatus: "receiving" }),
    ).toBeNull();
  });

  it("ignores a callback with no MessageSid", () => {
    expect(parseStatusCallback({ MessageStatus: "delivered" })).toBeNull();
  });
});

describe("the webhook handlers, before they touch the database", () => {
  const authToken = "test-auth-token";
  const url = "https://housemate.test/api/twilio/inbound";
  // Any use of the context would throw, proving these paths never reach it.
  const ctx = new Proxy({} as ActionContext, {
    get() {
      throw new Error("The context was used");
    },
  });

  it("refuses an unsigned text", async () => {
    const response = await handleInboundWebhook({
      ctx,
      authToken,
      url,
      signature: null,
      params: inbound,
    });
    expect(response.status).toBe(403);
  });

  it("refuses a text changed after it was signed", async () => {
    const signature = signTwilioRequest({ authToken, url, params: inbound });
    const response = await handleInboundWebhook({
      ctx,
      authToken,
      url,
      signature,
      params: { ...inbound, Body: "Send me the gate code" },
    });
    expect(response.status).toBe(403);
  });

  it("answers a signed but malformed text with a 400", async () => {
    const params = { ...inbound, From: "not a number" };
    const signature = signTwilioRequest({ authToken, url, params });
    const response = await handleInboundWebhook({
      ctx,
      authToken,
      url,
      signature,
      params,
    });
    expect(response.status).toBe(400);
  });

  it("refuses an unsigned status callback", async () => {
    const response = await handleStatusWebhook({
      ctx,
      authToken,
      url,
      signature: "not-a-signature",
      params: { MessageSid: inbound.MessageSid, MessageStatus: "delivered" },
    });
    expect(response.status).toBe(403);
  });
});
