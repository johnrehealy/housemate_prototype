import { describe, expect, it } from "vitest";
import { createAppsScriptAlerts } from "./apps-script-alerts";
import { createWaitlistAlerts } from "./create-alerts";
import type { WaitlistJoined } from "./types";

const URL = "https://script.example.com/macros/s/fake/exec";
const SECRET = "0123456789abcdef0123456789abcdef";
const SIGNUP: WaitlistJoined = {
  signupId: "3f1c8a52-0d7e-4b8e-9d51-6a2f4b1c9e07",
  email: "someone@example.com",
  joinedAt: new Date("2026-09-25T14:03:11Z"),
};

type Call = { url: string; init: RequestInit };

/** A fetch that answers from a list, one reply per call, and records calls. */
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

const json =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(Response.json(body, { status }));

function alerts(fetch: typeof globalThis.fetch, timeoutMs = 1_000) {
  return createAppsScriptAlerts({
    url: URL,
    secret: SECRET,
    fetch,
    timeoutMs,
    retryDelayMs: 0,
  });
}

describe("createAppsScriptAlerts", () => {
  it("posts the signup and the secret as JSON", async () => {
    const { fetch, calls } = fakeFetch(json({ ok: true }));

    expect(await alerts(fetch).joined(SIGNUP)).toEqual({ ok: true });

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call!.url).toBe(URL);
    expect(call!.init.method).toBe("POST");
    expect(call!.init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(call!.init.body))).toEqual({
      secret: SECRET,
      event: "waitlist.joined",
      signupId: SIGNUP.signupId,
      email: SIGNUP.email,
      joinedAt: "2026-09-25T14:03:11.000Z",
    });
  });

  it("counts a signup the sheet already has as sent", async () => {
    const { fetch } = fakeFetch(json({ ok: true, duplicate: true }));
    expect(await alerts(fetch).joined(SIGNUP)).toEqual({ ok: true });
  });

  it("reports a refusal without retrying it", async () => {
    const { fetch, calls } = fakeFetch(
      json({ ok: false, error: "unauthorized" }),
    );

    expect(await alerts(fetch).joined(SIGNUP)).toEqual({
      ok: false,
      reason: "unauthorized",
    });
    expect(calls).toHaveLength(1);
  });

  it("doesn't retry once the row is saved and only the email failed", async () => {
    const { fetch, calls } = fakeFetch(
      json({ ok: false, error: "email_failed" }),
    );

    expect(await alerts(fetch).joined(SIGNUP)).toEqual({
      ok: false,
      reason: "email_failed",
    });
    expect(calls).toHaveLength(1);
  });

  it("retries once after a network failure", async () => {
    const { fetch, calls } = fakeFetch(
      () => Promise.reject(new TypeError("fetch failed")),
      json({ ok: true }),
    );

    expect(await alerts(fetch).joined(SIGNUP)).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
    expect(calls[1]!.init.body).toBe(calls[0]!.init.body);
  });

  it("gives up after the retry, without throwing", async () => {
    const { fetch, calls } = fakeFetch(
      () => Promise.reject(new TypeError("fetch failed")),
      json({ ok: false }, 500),
    );

    expect(await alerts(fetch).joined(SIGNUP)).toEqual({
      ok: false,
      reason: "http_500",
    });
    expect(calls).toHaveLength(2);
  });

  it("times out a request that never answers", async () => {
    // Waits on the request's own signal, the way a real fetch would.
    const hang = (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener("abort", () =>
          reject(init.signal!.reason),
        );
      });
    const fetch = hang as unknown as typeof globalThis.fetch;

    expect(await alerts(fetch, 20).joined(SIGNUP)).toEqual({
      ok: false,
      reason: "timeout",
    });
  });

  it("treats an HTML error page as an unexpected reply", async () => {
    const page = () =>
      Promise.resolve(
        new Response("<html>TypeError: Cannot read properties</html>", {
          headers: { "Content-Type": "text/html" },
        }),
      );
    const { fetch } = fakeFetch(page, page);

    expect(await alerts(fetch).joined(SIGNUP)).toEqual({
      ok: false,
      reason: "unexpected_reply",
    });
  });

  it("never puts the address in a failure reason", async () => {
    const { fetch } = fakeFetch(json({ ok: false, error: "bad_request" }));

    const result = await alerts(fetch).joined(SIGNUP);
    expect(JSON.stringify(result)).not.toContain(SIGNUP.email);
  });
});

describe("createWaitlistAlerts", () => {
  it("is off unless both keys are set", () => {
    expect(createWaitlistAlerts({}).name).toBe("off");
    expect(createWaitlistAlerts({ WAITLIST_ALERT_URL: URL }).name).toBe("off");
  });

  it("uses the Apps Script when both are set", () => {
    expect(
      createWaitlistAlerts({
        WAITLIST_ALERT_URL: URL,
        WAITLIST_ALERT_SECRET: SECRET,
      }).name,
    ).toBe("apps-script");
  });

  it("sends nothing while off", async () => {
    expect(await createWaitlistAlerts({}).joined(SIGNUP)).toEqual({ ok: true });
  });
});
