import { describe, expect, it } from "vitest";
import { createAppsScriptMailer } from "./apps-script-mailer";
import { createMailer } from "./create-mailer";

const URL = "https://script.example.com/macros/s/fake/exec";
const SECRET = "0123456789abcdef0123456789abcdef";
const LINK = "http://localhost:3000/get-started/secret-token-value";
const CODE = "482913";

type Call = { url: string; init: RequestInit };

/** A fetch that gives one reply per call, and records the calls. */
function fakeFetch(...replies: Array<() => Promise<Response>>) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = replies[calls.length - 1];
    if (!next) throw new Error("unexpected call");
    return next();
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const json = (body: unknown) => () => Promise.resolve(Response.json(body));
const body = (call: Call | undefined) => JSON.parse(String(call?.init.body));

describe("createAppsScriptMailer", () => {
  it("posts the let-in email's details with the secret", async () => {
    const { fetch, calls } = fakeFetch(json({ ok: true }));
    const mailer = createAppsScriptMailer({ url: URL, secret: SECRET, fetch });

    const result = await mailer.sendLetIn({
      to: "rowan@example.com",
      firstName: "Rowan",
      link: LINK,
      expiresAt: new Date("2026-10-16T18:00:00Z"),
    });

    expect(result).toEqual({ ok: true });
    expect(calls[0]?.url).toBe(URL);
    expect(body(calls[0])).toEqual({
      secret: SECRET,
      event: "member.let_in",
      to: "rowan@example.com",
      firstName: "Rowan",
      link: LINK,
      expiresAt: "2026-10-16T18:00:00.000Z",
    });
  });

  it("posts a code, inside the Send Email hook's time", async () => {
    const { fetch, calls } = fakeFetch(json({ ok: true }));
    const mailer = createAppsScriptMailer({ url: URL, secret: SECRET, fetch });

    expect(
      await mailer.sendCode({ to: "sam@example.com", code: CODE }),
    ).toEqual({ ok: true });
    expect(body(calls[0])).toEqual({
      secret: SECRET,
      event: "member.code",
      to: "sam@example.com",
      code: CODE,
    });
    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
  });

  it("doesn't retry, and keeps the link and the code out of its reasons", async () => {
    const { fetch, calls } = fakeFetch(
      json({ ok: false, error: "email_failed" }),
      () => Promise.reject(new TypeError("fetch failed")),
    );
    const mailer = createAppsScriptMailer({ url: URL, secret: SECRET, fetch });

    const letIn = await mailer.sendLetIn({
      to: "rowan@example.com",
      link: LINK,
      expiresAt: new Date("2026-10-16T18:00:00Z"),
    });
    const code = await mailer.sendCode({ to: "sam@example.com", code: CODE });

    expect(letIn).toEqual({ ok: false, reason: "email_failed" });
    expect(code).toEqual({ ok: false, reason: "network" });
    expect(calls).toHaveLength(2);
    expect(JSON.stringify([letIn, code])).not.toMatch(/secret-token|482913/);
  });
});

describe("createMailer", () => {
  it("sends nothing unless the Apps Script is configured", async () => {
    const off = createMailer({});
    expect(off.name).toBe("off");
    expect(await off.sendCode({ to: "sam@example.com", code: CODE })).toEqual({
      ok: false,
      reason: "off",
    });

    expect(
      createMailer({ WAITLIST_ALERT_URL: URL, WAITLIST_ALERT_SECRET: SECRET })
        .name,
    ).toBe("apps-script");
  });
});
