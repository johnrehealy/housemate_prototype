import { expect, test } from "@playwright/test";

/**
 * Captures of the landing page for the Impeccable finish review, written to
 * `apps/web/.impeccable/review/landing/`. Not assertions — those live in
 * `landing.spec.ts`. Run with `CAPTURE=1 pnpm exec playwright test capture`.
 *
 * These run with reduced motion, and have to. A full-page screenshot resizes
 * the viewport to the height of the whole document, so nothing is ever
 * "entering" it and every scroll-driven animation stays pinned to its opening
 * keyframe — the captures come out blank. Reduced motion switches the motion
 * off and renders the finished state, which is both what the review needs to
 * see and, separately, proof that the no-motion fallback is the complete page.
 */

test.use({ reducedMotion: "reduce" });

const DIR = "apps/web/.impeccable/review/landing";

test("captures the landing page at both approved widths", async ({ page }) => {
  // The 1440 boards: hero H3 and panels P1–P7.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${DIR}/desktop.png`, fullPage: true });

  // Board N1, the narrow 390 layout.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${DIR}/narrow.png`, fullPage: true });

  // H1 and H2 — the email bar and the thanks, the two hero states the button
  // flips through.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByLabel("Email address")).toBeFocused();
  await page.screenshot({ path: `${DIR}/hero-email.png` });

  await page
    .getByLabel("Email address")
    .fill(`capture.${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.screenshot({ path: `${DIR}/hero-thanks.png` });
});
