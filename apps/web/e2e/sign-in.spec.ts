import { expect, test } from "@playwright/test";
import { TEST_CODE, UNINVITED_PHONE, signIn } from "./support";

/**
 * Sign-in itself. These start signed out; see playwright.config.ts.
 *
 * Supabase throttles code requests per number, so only the test that has to
 * sign in for real uses the seeded number. How a typed number becomes E.164 is
 * covered by unit tests on `toE164`, not here.
 */

test("sends a signed-out visitor to sign-in", async ({ page }) => {
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("answers an uninvited number exactly as an invited one", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number").fill(UNINVITED_PHONE);
  await page.getByRole("button", { name: "Send code" }).click();

  // Housemate is invite-only, so this page must not reveal who is in the
  // pilot: the answer is the same either way.
  await expect(page.getByText("If that number is invited")).toBeVisible();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
});

test("refuses a wrong code, and an uninvited number that guesses", async ({
  page,
}) => {
  // Deliberately the uninvited number: it reaches the code step like any
  // other, and it keeps this test off the seeded number's request throttle.
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number").fill(UNINVITED_PHONE);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Six-digit code").fill(TEST_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Next renders its own route-announcer alert, so scope this to ours.
  await expect(
    page.getByRole("alert").filter({ hasText: "didn't work" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("refuses a number that isn't a number", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Send code" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "10-digit" }),
  ).toBeVisible();
  await expect(page.getByLabel("Six-digit code")).toBeHidden();
});

test("signs an invited member in, and out again", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  // The session is really gone, not just navigated away from.
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/sign-in$/);
});
