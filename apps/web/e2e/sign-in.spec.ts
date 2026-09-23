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
  await expect(page.getByText("is on the invite list")).toBeVisible();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
});

test("the code step submits itself, with no button to press", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number").fill(UNINVITED_PHONE);
  await page.getByRole("button", { name: "Send code" }).click();

  // The behavior D-036 approved: no submit button, and the member is told so
  // before they type (WCAG 3.2.2).
  await expect(page.getByRole("button", { name: "Sign in" })).toHaveCount(0);
  await expect(
    page.getByText("as soon as all six digits are in"),
  ).toBeVisible();
});

test("refuses a wrong code, and an uninvited number that guesses", async ({
  page,
}) => {
  // Deliberately the uninvited number: it reaches the code step like any
  // other, and it keeps this test off the seeded number's request throttle.
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number").fill(UNINVITED_PHONE);
  await page.getByRole("button", { name: "Send code" }).click();

  // Filling the sixth digit is the submit.
  await page.getByLabel("Six-digit code").fill(TEST_CODE);

  // Next renders its own route-announcer alert, so scope this to ours.
  await expect(
    page.getByRole("alert").filter({ hasText: "didn't work" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);

  // The digits are left selected, so typing replaces them.
  await expect(page.getByLabel("Six-digit code")).toBeFocused();
});

test("holds the member in place while it signs them in", async ({ page }) => {
  // The uninvited number again: this reaches the working state and then the
  // wrong-code state, so nobody is ever signed in and the throttle is untouched.
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number").fill(UNINVITED_PHONE);
  await page.getByRole("button", { name: "Send code" }).click();

  const field = page.getByLabel("Six-digit code");
  const message = page.locator("#code-message");

  // ::selection is authored, not inherited, and a headless window paints an
  // unfocused selection its own grey — so read the rule rather than the pixels.
  const selection = await field.evaluate(
    (el) => getComputedStyle(el, "::selection").backgroundColor,
  );
  // Tailwind v4 emits the /12 modifier in oklab; this is #14342F at 12%.
  expect(selection).toBe("oklab(0.299134 -0.0389275 -0.00135583 / 0.12)");

  // role="status" is on the hint as well as the working line. If it arrived
  // with "Signing you in…", the region would go live in the same commit as its
  // text and screen readers wouldn't announce it (D-037, WCAG 4.1.3).
  await expect(message).toHaveAttribute("role", "status");

  // Hold the action's response so the working state can be asserted at all.
  await page.route("**/sign-in", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });

  await field.fill("000000");

  await expect(message).toHaveText(/Signing you in/);
  await expect(message).toHaveAttribute("role", "status");
  // readOnly, not disabled: the field keeps focus and stays in the tab order.
  await expect(field).toBeFocused();
  await expect(field).toHaveCSS("background-color", "rgb(245, 243, 241)"); // --color-nav
  await expect(field).toHaveCSS("border-top-color", "rgb(236, 232, 229)"); // --color-line
  await expect(
    page.getByRole("button", { name: "Use a different number" }),
  ).toBeDisabled();
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

test("draws the approved page at each of the three widths", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const panel = page.locator("div.bg-evergreen");
  const field = page.getByLabel("Mobile number");
  // The invite note is written twice, once in the panel and once in the form
  // column, and exactly one of the two is ever shown.
  const notes = page.getByText("Housemate is invite-only");

  // Wide (D-036): the 600px story panel, full height.
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("width", "600px");
  await expect(notes).toHaveCount(2);
  await expect(notes.first()).toBeVisible();
  await expect(notes.last()).toBeHidden();
  await expect(field).toHaveCSS("height", "40px");

  // A1 focuses the field on load, so evergreen is the state actually drawn
  // here; the muted resting border only appears once focus leaves.
  await expect(field).toBeFocused();
  await expect(field).toHaveCSS("border-top-color", "rgb(20, 52, 47)");
  await field.blur();
  await expect(field).toHaveCSS(
    "border-top-color",
    "rgb(104, 112, 110)", // --color-muted, the approved resting border
  );

  // Medium (D-056): the panel narrows to 400px and keeps all three rows.
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("width", "400px");
  await expect(panel.locator("li")).toHaveCount(3);

  // Narrow (D-056): one column, and the invite note moves out of the panel.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeHidden();
  await expect(notes.first()).toBeHidden();
  await expect(notes.last()).toBeVisible();
  await expect(field).toHaveCSS("width", "342px"); // 390 less the 24px gutters
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
