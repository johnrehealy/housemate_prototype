import { expect, test } from "@playwright/test";

/**
 * The landing page. These start signed out; see playwright.config.ts, where
 * this file is listed in the `signed-out` project — a spec that matches no
 * project is silently never run.
 *
 * The addresses here are generated per run, so a re-run doesn't depend on what
 * the last one left in the table.
 */

const PANEL_HEADINGS = [
  "Built for busy homes",
  "Designed to feel familiar",
  "Equipped to deliver",
  "Supported by real people",
  "Controlled by you",
  "Your home is your business",
];

function newAddress() {
  return `landing.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Opens the hero's email bar and submits `address`. */
async function join(page: import("@playwright/test").Page, address: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
}

test("shows a signed-out visitor the page, not sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  // Not "Housemate · Housemate": the root layout templates every other title.
  await expect(page).toHaveTitle("Housemate");

  // The heading reads as one steady line however long the rotation runs.
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("Every home needs");
  await expect(heading).toContainText("a Housemate.");
});

test("every rotating phrase fits its slot, at every width", async ({
  page,
}) => {
  await page.goto("/");
  // The hero is sized to its longest phrase rather than wrapped around it
  // (board H4 r3, option A), so a phrase that grows, or a width nobody looked
  // at, would be clipped by the slot without any other sign.
  for (const width of [320, 390, 640, 767, 768, 1023, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const misfits = await page.evaluate(() => {
      const slot = document.querySelector<HTMLElement>("h1 > [aria-hidden]")!;
      return [...slot.children]
        .filter(
          (phrase) =>
            phrase.scrollWidth > slot.clientWidth + 1 ||
            phrase.getBoundingClientRect().height > slot.clientHeight + 1,
        )
        .map((phrase) => phrase.textContent);
    });
    expect(misfits, `at ${width}px`).toEqual([]);
  }
});

test("carries every panel on one page", async ({ page }) => {
  await page.goto("/");
  for (const heading of PANEL_HEADINGS) {
    await expect(page.getByRole("heading", { name: heading })).toBeAttached();
  }
  await expect(
    page.getByRole("heading", { name: "Let Housemate take it from here." }),
  ).toBeAttached();
});

test("the ribbon reaches sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("takes an address and says thanks", async ({ page }) => {
  await join(page, newAddress());
  await expect(page.getByRole("status")).toHaveText(
    "Thanks for joining the waitlist!",
  );
});

test("says exactly the same thing to an address already on the list", async ({
  page,
}) => {
  const address = newAddress();
  await join(page, address);
  await expect(page.getByRole("status")).toBeVisible();

  // Same answer either way, so the page can't be used to find out who has
  // signed up — the rule sign-in follows for numbers.
  await join(page, address);
  await expect(page.getByRole("status")).toHaveText(
    "Thanks for joining the waitlist!",
  );
});

test("asks for an address when the field is empty", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  // Left empty. A malformed address is caught by the email input itself and
  // never reaches the server; an empty one is what the server has to answer.
  await page.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Enter an email address." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("the close's call to action lands on a field, not a button", async ({
  page,
}) => {
  await page.goto("/");
  // The last ask on the page. It is 6,000px from the hero, so landing on the
  // closed button would cost the visitor a second click to get anywhere to
  // type — at the highest-intent moment there is.
  await page.getByRole("link", { name: "Join the waitlist" }).last().click();

  await expect(page.getByLabel("Email address")).toBeFocused();
});

test("the hero's cue goes to the first panel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Learn more" }).click();
  await expect(page).toHaveURL(/#built$/);
});

// Whether the button is there is about where you are on the page, so reduced
// motion changes how it arrives, not when.
for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`the ribbon's waitlist button waits for the first panel (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    const ribbon = page.getByRole("navigation", { name: "Site" });
    const ribbonJoin = ribbon.getByRole("link", { name: "Join the waitlist" });

    // On the hero, the hero's own call to action is the only one — including
    // part way down it, where the button used to arrive.
    await expect(ribbonJoin).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect(ribbonJoin).toBeHidden();

    // "Learn more" lands P1 exactly where it is fully on screen, so the button
    // has to be there on arrival, not one scroll later.
    await page.getByRole("link", { name: "Learn more" }).click();
    await expect(page).toHaveURL(/#built$/);
    await expect(ribbonJoin).toBeVisible();

    // "Sign in" holds the bar's right edge, before and after.
    await expect(ribbon.getByRole("link").last()).toHaveText("Sign in");
  });
}

test("has nothing to scroll sideways at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
