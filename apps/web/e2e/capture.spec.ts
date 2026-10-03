import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import { expect, test, type Page } from "@playwright/test";
import {
  MEMBER,
  NEWCOMER,
  NEW_PHONE,
  requestSignInCode,
  signInStaff,
} from "./support";

/**
 * Captures for the design check and the Impeccable finish review, written to
 * `apps/web/.impeccable/review/`. Not assertions — those live in
 * `sign-in.spec.ts` and `get-started.spec.ts`. Run on a freshly seeded
 * database with `CAPTURE=1 pnpm exec playwright test --project=capture`.
 *
 * Each capture is set up in the state its board draws. Nothing here creates an
 * account: Get started stops at G4, sign-in at S2. It does add waitlist rows.
 */

test.use({ reducedMotion: "reduce" });
test.describe.configure({ mode: "serial" });

const DIR = "apps/web/.impeccable/review";
const DESKTOP = { width: 1440, height: 900 };
const NARROW = { width: 390, height: 844 };

let wrenLink = "";

/** Screenshots once colour transitions (120ms) and focus rings have landed. */
async function shot(page: Page, name: string) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

const next = (page: Page) => page.getByRole("button", { name: "Continue" });

test("sign-in (S1, S2)", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByLabel("Mobile number or email")).toBeFocused();
  await shot(page, "s1-sign-in-error");
  await page.getByLabel("Mobile number or email").fill(MEMBER.phone);
  await shot(page, "s1-sign-in");

  await requestSignInCode(page, MEMBER.phone);
  await page.getByLabel("Six-digit code").fill("000000");
  await expect(page.getByText(/That code didn’t work/)).toBeVisible();
  await shot(page, "s1-code-by-text-wrong");

  await requestSignInCode(page, MEMBER.email);
  await shot(page, "s1-code-by-email");

  await page.setViewportSize(NARROW);
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number or email").fill(MEMBER.email);
  await shot(page, "s2-sign-in-narrow");
});

test("ops waitlist (O5)", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await signInStaff(page);
  await expect(page.getByText("Pilot places left")).toBeVisible();
  await shot(page, "o5-waitlist");

  const row = page.getByRole("row").filter({ hasText: NEWCOMER.email });
  await row.getByRole("button", { name: "Let in" }).click();
  const link = page.getByLabel(`Get started link for ${NEWCOMER.email}`);
  await expect(link).toHaveValue(/\/get-started\//);
  wrenLink = new URL(await link.inputValue()).pathname;
  await page.mouse.move(0, 0);
  await shot(page, "o5-not-emailed");
});

for (const [size, viewport, suffix] of [
  ["wide", DESKTOP, ""],
  ["narrow", NARROW, "-narrow"],
] as const) {
  test(`Get started from the website, ${size} (G0–G3, W1)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/get-started");
    await shot(page, `g0-welcome${suffix}`);
    await page.getByRole("button", { name: "Let’s get started" }).click();

    // Both names missing: focus goes to the first, which keeps its ring.
    await next(page).click();
    await expect(page.getByLabel("First name")).toBeFocused();
    await shot(page, `g1-name-errors${suffix}`);

    await page.getByLabel("First name").fill("River");
    await page.getByLabel("Last name").fill("Sample");
    await shot(page, `g1-name${suffix}`);
    await next(page).click();

    const search = page.getByRole("combobox", { name: "Home address" });
    // Out of the list's way, so hovering doesn't move its highlight.
    await page.mouse.move(0, 0);
    await search.fill("1450 Samp");
    await expect(page.getByRole("option")).toHaveCount(4);
    await shot(page, `g2-home-suggestions${suffix}`);
    await page.getByRole("option", { name: /1450 Sample Street/ }).click();
    await expect(page.getByAltText(/^Map of/)).toBeVisible();
    await shot(page, `g2-home-picked${suffix}`);
    await next(page).click();

    await page.getByLabel("Email").fill(`river.${size}@example.com`);
    await page.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
    await shot(page, `g3-contact-no-number${suffix}`);
    await next(page).click();
    await expect(page.getByText("Housemate works best by text.")).toBeVisible();
    await shot(page, `g3-callout${suffix}`);

    await page.getByLabel("Mobile number (optional)").fill(NEW_PHONE);
    await page.getByRole("checkbox", { name: SMS_OPT_IN.label }).check();
    await page.getByLabel("Mobile number (optional)").focus();
    await shot(page, `g3-contact-texts-on${suffix}`);

    // Not on the alpha list: W1.
    await page.getByLabel("Mobile number (optional)").fill("");
    await next(page).click();
    await page.waitForTimeout(600);
    await next(page).click();
    await expect(
      page.getByRole("heading", { name: "You’re on the waitlist." }),
    ).toBeVisible();
    await shot(page, `w1-waitlisted${suffix}`);
  });
}

test("Get started from a link (G4 by email, G6)", async ({ page }) => {
  expect(wrenLink).not.toBe("");
  await page.setViewportSize(DESKTOP);
  await page.goto(wrenLink);
  await page.getByRole("button", { name: "Let’s get started" }).click();
  const code = page.getByLabel("Six-digit code");
  await expect(code).toBeVisible();
  await code.fill("482");
  await shot(page, "g4-code-by-email");
  await code.fill("482917");
  await expect(page.getByText(/That code didn’t work/)).toBeVisible();
  await shot(page, "g4-code-wrong");

  await page.goto("/get-started/not-a-real-link");
  await shot(page, "g6-link-expired");
});

test("the texts page (L4, L4n)", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto("/texts");
  await page.screenshot({ path: `${DIR}/l4-texts.png`, fullPage: true });
  await page.setViewportSize(NARROW);
  await page.goto("/texts");
  await page.screenshot({
    path: `${DIR}/l4n-texts-narrow.png`,
    fullPage: true,
  });
});
