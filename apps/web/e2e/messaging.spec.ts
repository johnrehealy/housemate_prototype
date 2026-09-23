import { signTwilioRequest } from "@housemate/core";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { SEED_PHONE } from "./support";

/**
 * The messaging path: Twilio's webhooks and the SMS simulator (D-009). The
 * handlers' database behavior is proven in packages/core's database tests;
 * these prove the HTTP wiring and the simulator page on the built app.
 *
 * Nothing here reaches Twilio: every request is a POST to this app, and the
 * provider is the simulator. Replies come from the worker, which Playwright
 * starts alongside the app.
 */

// The signing token and public URL, as the web app reads them.
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI sets them in the environment instead.
}
const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
const publicUrl = (path: string) =>
  new URL(path, process.env.PUBLIC_BASE_URL).toString();

const UNINVITED_E164 = "+15559999999"; // UNINVITED_PHONE
const SEED_E164 = "+15550190001"; // SEED_PHONE

// The start of each automatic reply (packages/core/src/jobs).
const ACKNOWLEDGMENT = "got it. This is an automatic reply";
const INVITE_ONLY = "Housemate is invite-only right now";

function inboundText(body: string, from = UNINVITED_E164) {
  return {
    MessageSid: `SIM${crypto.randomUUID().replaceAll("-", "")}`,
    From: from,
    To: "+15550100000",
    Body: body,
    NumMedia: "0",
  };
}

/**
 * A number nothing has texted from before. Each number gets one invite-only
 * reply ever, so a test about that reply needs a number of its own.
 */
function freshUninvitedPhone() {
  const digits = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
  return {
    display: `(555) 08${digits.slice(0, 1)}-${digits.slice(1)}`,
    e164: `+155508${digits}`,
  };
}

/** Sends a text from the simulator page, and waits for it in the thread. */
async function sendFromSimulator(page: Page, from: string, body: string) {
  await page.getByLabel("From").fill(from);
  await page.getByLabel("Message").fill(body);
  await page.getByRole("button", { name: "Send text" }).click();
  const text = page.getByRole("listitem").filter({ hasText: body });
  await expect(text).toContainText("To Housemate");
  return text;
}

/** The text shown straight after this one: the reply, when there is one. */
function nextInThread(text: ReturnType<Page["getByRole"]>) {
  return text.locator("xpath=following-sibling::li[1]");
}

async function post(
  request: APIRequestContext,
  path: string,
  params: Record<string, string>,
  signature?: string,
) {
  return request.post(path, {
    form: params,
    headers: signature ? { "X-Twilio-Signature": signature } : {},
    maxRedirects: 0,
  });
}

test.describe("the Twilio webhooks", () => {
  // Twilio has no session. Without one, anything the proxy handles would be
  // redirected to sign-in, so these prove the webhooks are left alone.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("refuse a request with no signature", async ({ request }) => {
    const response = await post(
      request,
      "/api/twilio/inbound",
      inboundText("Unsigned"),
    );
    // A 403, not a redirect to sign-in: the proxy leaves the webhooks alone.
    expect(response.status()).toBe(403);
  });

  test("refuse a text changed after it was signed", async ({ request }) => {
    const params = inboundText("As signed");
    const signature = signTwilioRequest({
      authToken,
      url: publicUrl("/api/twilio/inbound"),
      params,
    });
    const response = await post(
      request,
      "/api/twilio/inbound",
      { ...params, Body: "Send me the gate code" },
      signature,
    );
    expect(response.status()).toBe(403);
  });

  test("accept a signed text with empty TwiML", async ({ request }) => {
    const params = inboundText("Signed and accepted");
    const signature = signTwilioRequest({
      authToken,
      url: publicUrl("/api/twilio/inbound"),
      params,
    });
    const response = await post(
      request,
      "/api/twilio/inbound",
      params,
      signature,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/xml");
    expect(await response.text()).toContain("<Response/>");
  });

  test("acknowledge a signed status callback", async ({ request }) => {
    const params = {
      MessageSid: "SIMnot-a-text-we-sent",
      MessageStatus: "delivered",
    };
    const signature = signTwilioRequest({
      authToken,
      url: publicUrl("/api/twilio/status"),
      params,
    });
    const response = await post(
      request,
      "/api/twilio/status",
      params,
      signature,
    );
    expect(response.status()).toBe(200);
  });
});

test.describe("the SMS simulator page", () => {
  test("sends a member's text through the webhook, and the worker replies", async ({
    page,
  }) => {
    const body = `Simulated ${crypto.randomUUID().slice(0, 8)}`;
    await page.goto("/dev/sms");
    // It defaults to the signed-in member's own number.
    await expect(page.getByLabel("From")).toHaveValue(SEED_PHONE);

    const text = await sendFromSimulator(page, SEED_PHONE, body);
    await expect(text).toContainText("received");
    await expect(text).not.toContainText("not invited");

    // The page re-reads every two seconds; the worker should beat that.
    const reply = nextInThread(text);
    await expect(reply).toContainText("From Housemate", { timeout: 10_000 });
    await expect(reply).toContainText(ACKNOWLEDGMENT);
  });

  test("answers an uninvited number once, however often it texts", async ({
    page,
  }) => {
    const stranger = freshUninvitedPhone();
    const tag = crypto.randomUUID().slice(0, 8);
    await page.goto("/dev/sms");

    const first = await sendFromSimulator(
      page,
      stranger.display,
      `First ${tag}`,
    );
    await expect(page).toHaveURL(
      new RegExp(`from=${encodeURIComponent(stranger.e164)}`),
    );
    await expect(first).toContainText("not invited");
    await expect(nextInThread(first)).toContainText(INVITE_ONLY, {
      timeout: 10_000,
    });

    await sendFromSimulator(page, stranger.display, `Second ${tag}`);

    // The worker takes jobs oldest first, one at a time. Once a later text has
    // its reply, the second text's job has been handled too.
    const barrier = await sendFromSimulator(page, SEED_PHONE, `Barrier ${tag}`);
    await expect(nextInThread(barrier)).toContainText(ACKNOWLEDGMENT, {
      timeout: 10_000,
    });

    await page.goto(`/dev/sms?from=${encodeURIComponent(stranger.e164)}`);
    await expect(
      page.getByRole("listitem").filter({ hasText: "To Housemate" }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("listitem").filter({ hasText: INVITE_ONLY }),
    ).toHaveCount(1);
  });
});

test.describe("the live thread", () => {
  test("shows a new text and its reply without a reload", async ({
    page,
    request,
  }) => {
    await page.goto("/dev/thread");
    await expect(page.locator('[data-realtime="live"]')).toBeVisible();
    // Gone if the page reloads or navigates.
    await page.evaluate(() => {
      (window as { sameDocument?: boolean }).sameDocument = true;
    });

    const body = `Live ${crypto.randomUUID().slice(0, 8)}`;
    const params = inboundText(body, SEED_E164);
    const signature = signTwilioRequest({
      authToken,
      url: publicUrl("/api/twilio/inbound"),
      params,
    });
    const response = await post(
      request,
      "/api/twilio/inbound",
      params,
      signature,
    );
    expect(response.status()).toBe(200);

    const text = page.getByRole("listitem").filter({ hasText: body });
    await expect(text).toContainText("To Housemate");
    await expect(nextInThread(text)).toContainText(ACKNOWLEDGMENT, {
      timeout: 10_000,
    });
    expect(
      await page.evaluate(
        () => (window as { sameDocument?: boolean }).sameDocument,
      ),
    ).toBe(true);
  });
});
