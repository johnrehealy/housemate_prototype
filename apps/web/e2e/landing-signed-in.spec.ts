import { expect, test } from "@playwright/test";

/**
 * The one thing about the landing page that needs a session. It lives in its
 * own file because the `signed-in` project carries a saved session and
 * `landing.spec.ts` must run without one.
 */

test("sends a signed-in member straight to the app", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/chat$/);
});
