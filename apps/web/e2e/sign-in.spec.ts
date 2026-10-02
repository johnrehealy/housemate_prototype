import { expect, test } from "@playwright/test";
import {
  MEMBER,
  TEST_CODE,
  emailedCode,
  expectInApp,
  expectNoSidewaysScroll,
  requestSignInCode,
  signInMember,
  signInStaff,
  waitToSend,
} from "./support";

/**
 * Sign-in (D-073, boards S1 and S2): a mobile number or email, then a code
 * texted or emailed to it. These start signed out; see playwright.config.ts.
 * How a typed identifier is read as an email or a number is covered by unit
 * tests on `readSignInIdentifier`.
 */

const WRONG_CODE = "That code didn’t work. Check it, or send a new one.";

test("sends a signed-out visitor to sign-in", async ({ page }) => {
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  // New people join the waitlist through Get started (D-072).
  await page.getByRole("link", { name: "Join the waitlist" }).click();
  await expect(page).toHaveURL(/\/get-started$/);
});

test("the old welcome and reset pages are gone", async ({ page }) => {
  // Signed out, the proxy sends every app page to sign-in first.
  await signInMember(page);
  expect((await page.goto("/welcome"))?.status()).toBe(404);
  expect((await page.goto("/reset-password"))?.status()).toBe(404);
});

test("keeps /ops for staff", async ({ page }) => {
  await page.goto("/ops/waitlist");
  await expect(page).toHaveURL(/\/sign-in$/);

  // A member who isn't staff finds nothing there.
  await signInMember(page);
  const response = await page.goto("/ops/waitlist");
  expect(response?.status()).toBe(404);
});

test("signs a member in with a texted code, and out again", async ({
  page,
}) => {
  await requestSignInCode(page, MEMBER.phone);
  await expect(
    page.getByRole("heading", { name: "Check your texts" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `If ${MEMBER.phone} has an account, we’ve texted it a code.`,
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Six-digit code")).toBeFocused();
  await page.getByLabel("Six-digit code").fill(TEST_CODE);
  await expectInApp(page);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  // The session is really gone, not just navigated away from.
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("signs a member in with an emailed code", async ({ page }) => {
  const since = new Date();
  await requestSignInCode(page, MEMBER.email);
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await page
    .getByLabel("Six-digit code")
    .fill(await emailedCode(MEMBER.email, since));
  await expectInApp(page);
});

test("takes staff to /ops", async ({ page }) => {
  await signInStaff(page);
  await expect(page.getByText("Pilot places left")).toBeVisible();
});

test("answers an unknown number or email as if it were real", async ({
  page,
}) => {
  // Nothing is sent, and nothing on the page says so (D-073).
  await requestSignInCode(page, "(555) 019-0999");
  await expect(
    page.getByText("If (555) 019-0999 has an account, we’ve texted it a code."),
  ).toBeVisible();

  await requestSignInCode(page, "nobody@example.com");
  await expect(
    page.getByText(
      "If nobody@example.com has an account, we’ve emailed it a code.",
    ),
  ).toBeVisible();
});

test("a wrong code stays selected to type over, and a different number goes back", async ({
  page,
}) => {
  await requestSignInCode(page, MEMBER.phone);
  const code = page.getByLabel("Six-digit code");
  await code.fill("000000");
  await expect(page.getByText(WRONG_CODE)).toBeVisible();
  await expect(code).toHaveAttribute("aria-invalid", "true");
  await expect(code).toBeFocused();
  const selected = await code.evaluate((input: HTMLInputElement) =>
    input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0),
  );
  expect(selected).toBe("000000");

  // Typing over it signs in.
  await page.keyboard.type(TEST_CODE);
  await expectInApp(page);
});

test("Use a different number keeps what was typed", async ({ page }) => {
  await requestSignInCode(page, MEMBER.phone);
  await page.getByRole("button", { name: "Use a different number" }).click();
  await expect(page.getByLabel("Mobile number or email")).toHaveValue(
    MEMBER.phone,
  );
});

test("Send again sends a new code and counts down", async ({ page }) => {
  await requestSignInCode(page, MEMBER.phone);
  await waitToSend(page, MEMBER.phone);
  await page.getByRole("button", { name: "Send again" }).click();
  await expect(
    page.getByText(/New code sent\. You can ask again in 0:\d\d\./),
  ).toBeVisible();
  await expect(page.getByLabel("Six-digit code")).toBeFocused();
  await page.getByLabel("Six-digit code").fill(TEST_CODE);
  await expectInApp(page);
});

test("asks for something to send to", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(
    page.getByText("Enter your mobile number or email."),
  ).toBeVisible();
  await expect(page.getByLabel("Mobile number or email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("the page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  await expectNoSidewaysScroll(page);
  // The centred frame's 24px gutters.
  await expect(page.getByLabel("Mobile number or email")).toHaveCSS(
    "width",
    "342px",
  );
});
