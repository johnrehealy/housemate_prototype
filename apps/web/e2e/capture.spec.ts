import { expect, test } from "@playwright/test";
import { TEST_CODE, UNINVITED_PHONE } from "./support";

/**
 * Captures for the Impeccable finish review, written to
 * `apps/web/.impeccable/review/`. Not assertions — the assertions live in
 * `sign-in.spec.ts`. Run with `pnpm exec playwright test capture`.
 *
 * The uninvited number is used throughout, so this never touches the seeded
 * number's request throttle and never signs anyone in.
 */

const DIR = "apps/web/.impeccable/review";

test("captures every shipped sign-in state", async ({ page }) => {
  // A1 — phone step at 1440 x 900, the approved reference frame.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sign-in");
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await page.screenshot({ path: `${DIR}/desktop.png`, fullPage: true });

  // A9 — medium. The panel narrows to 400px and keeps all three rows.
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator("div.bg-evergreen")).toHaveCSS("width", "400px");
  await page.screenshot({ path: `${DIR}/medium.png`, fullPage: true });

  // A7 — narrow. One column, no panel.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("div.bg-evergreen")).toBeHidden();
  await page.screenshot({ path: `${DIR}/mobile.png`, fullPage: true });

  // A3 — the code step, the surface's signature interaction.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel("Mobile number").fill(UNINVITED_PHONE);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
  await page.screenshot({ path: `${DIR}/code-step.png`, fullPage: true });

  // A8 — the code step narrow.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${DIR}/code-step-narrow.png`,
    fullPage: true,
  });

  // A5 — wrong code. Filling the sixth digit is the submit.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel("Six-digit code").fill(TEST_CODE);
  await expect(
    page.getByRole("alert").filter({ hasText: "didn't work" }),
  ).toBeVisible();
  await page.screenshot({ path: `${DIR}/code-error.png`, fullPage: true });

  // A4 — signing in. The response is held open so the state can be caught; the
  // code is still a wrong one, so this ends in an error rather than a session.
  await page.route("**/sign-in", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    await route.continue();
  });
  await page.getByLabel("Six-digit code").fill("000000");
  await expect(page.locator("#code-message")).toHaveText(/Signing you in/);
  await page.screenshot({ path: `${DIR}/code-working.png`, fullPage: true });
});
