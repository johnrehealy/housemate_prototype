import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import { expect, test, type Page } from "@playwright/test";
import {
  MEMBER,
  NEWCOMER,
  NEW_PHONE,
  TEST_CODE,
  emailedCode,
  expectInApp,
  expectNoSidewaysScroll,
  signIn,
  signInStaff,
} from "./support";

/**
 * Joining the pilot (D-072, D-074; boards G0–G7, W1, O5): anyone can give
 * their details through Get started; the alpha list decides who goes on to a
 * code and an account. Staff let people in on /ops/waitlist, and mail is off
 * in tests, so each link is read from the panel ops shows instead.
 *
 * The steps run in order and use up the seeded waitlist entry and number, so
 * this needs a freshly seeded database. Addresses come from the fake lookup
 * (ADDRESS_LOOKUP=fake), so nothing here calls Google; codes are the local
 * test code or read from Mailpit, so nothing is ever sent.
 */

test.describe.configure({ mode: "serial" });

/** Let in from the toolbar, with nothing on the list: only an email. */
const ALPHA_LINK = { email: "alex.alpha@example.com", firstName: "Alex" };
/** Let in from the toolbar, then joins on the website. */
const ALPHA_SITE = { email: "blair.alpha@example.com", firstName: "Blair" };

const links: Record<string, string> = {};

const question = (page: Page) => page.getByRole("heading", { level: 1 });
const next = (page: Page) => page.getByRole("button", { name: "Continue" });

test("shows the expired page for a link that doesn't exist", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/get-started/not-a-real-link");
  await expect(
    page.getByRole("heading", { name: "This link has expired." }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("someone not on the alpha list joins the waitlist", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/get-started");

  // G0, then G1: name.
  await expect(question(page)).toHaveText("Welcome to Housemate.");
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: "Let’s get started" }).click();
  await expect(question(page)).toHaveText("What’s your name?");
  await next(page).click();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await expect(page.getByText("Enter your last name.")).toBeVisible();
  // Focus goes to the first field to fix.
  await expect(page.getByLabel("First name")).toBeFocused();
  await page.getByLabel("First name").fill("River");
  await page.getByLabel("Last name").fill("Sample");
  await next(page).click();

  // G2: home. Continue needs a picked address.
  await expect(question(page)).toContainText("Nice to meet you, River.");
  await expectNoSidewaysScroll(page);
  await next(page).click();
  await expect(
    page.getByText("Pick your address from the list, or enter it yourself."),
  ).toBeVisible();

  // An address that isn't found offers typing it in. Continue without a pick
  // opens the list under the error, not over it.
  const search = page.getByRole("combobox", { name: "Home address" });
  const notFound = page.getByText("We can’t find that address");
  await search.fill("9999 Nowhere");
  await expect(notFound).toBeVisible();
  await next(page).click();
  const pickError = page.getByText(
    "Pick your address from the list, or enter it yourself.",
  );
  await expect(search).toBeFocused();
  await expect(notFound).toBeVisible();
  const errorBox = await pickError.boundingBox();
  const panelBox = await notFound.boundingBox();
  expect(panelBox!.y).toBeGreaterThan(errorBox!.y + errorBox!.height);

  // The keyboard reaches "Enter it yourself": Tab goes to Clear, then to it.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Enter it yourself" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  const street = page.getByLabel("Street address");
  await expect(street).toBeFocused();
  await expect(street).toHaveValue("9999 Nowhere");

  // Each part is checked.
  await next(page).click();
  await expect(page.getByText("Enter a 5-digit ZIP code.")).toBeVisible();
  await street.fill("1450 Sample Street");

  // Back to the search, which picks up the typed street and takes focus.
  await page
    .getByRole("button", { name: "Search for your address instead" })
    .click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("1450 Sample Street");
  await pickHome(page);

  // The browser's Back goes back a step and keeps what was typed.
  await next(page).click();
  await expect(question(page)).toHaveText("How may we contact you?");
  await page.goBack();
  await expect(question(page)).toContainText("Nice to meet you, River.");
  await expect(search).toHaveValue("1450 Sample Street, Testville, IL 00001");
  await next(page).click();

  // G3: contact. The Terms box starts unticked and is required.
  await expect(question(page)).toHaveText("How may we contact you?");
  await expectNoSidewaysScroll(page);
  const email = page.getByLabel("Email");
  const phone = page.getByLabel("Mobile number (optional)");
  const terms = page.getByRole("checkbox", { name: /I agree to the Terms/ });
  const texts = page.getByRole("checkbox", { name: SMS_OPT_IN.label });
  await expect(terms).not.toBeChecked();
  // The texts box only appears with a number.
  await expect(texts).toHaveCount(0);

  await next(page).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Agree to the Terms to continue.")).toBeVisible();
  await expect(email).toBeFocused();

  // Without a number, the first Continue shows the callout instead. A second
  // press straight away is ignored, so a double-click can't skip it.
  await email.fill(MEMBER.email);
  await terms.check();
  await next(page).click();
  await expect(page.getByText("Housemate works best by text.")).toBeVisible();
  await next(page).click();
  await expect(question(page)).toHaveText("How may we contact you?");
  await page.waitForTimeout(600);

  // A member's email or number is turned away, with a way to sign in.
  await next(page).click();
  await expect(
    page.getByText("That email already has a Housemate account."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in instead" }),
  ).toBeVisible();

  // With a number, the texts box appears unticked, and the callout's other
  // wording comes first. The email is mistyped, to be fixed from W1.
  await email.fill("river.waitlst@example.com");
  await phone.fill(MEMBER.phone);
  await expect(texts).not.toBeChecked();
  await next(page).click();
  await expect(
    page.getByText("Your number will only get sign-in codes.", {
      exact: false,
    }),
  ).toBeVisible();
  // With the texts box, G3 runs past the fold at 390, so the callout and
  // Continue are brought into view. While it shows, the button says what a
  // press does, and ticking the box takes both back.
  await expect(next(page)).toBeInViewport();
  await expect(next(page)).toHaveText("Continue without texts");
  await texts.check();
  await expect(page.getByText("Housemate works best by text.")).toHaveCount(0);
  await expect(next(page)).toHaveText("Continue");
  await texts.uncheck();
  await next(page).click();
  await expect(next(page)).toHaveText("Continue without texts");
  await page.waitForTimeout(600);
  await next(page).click();
  await expect(
    page.getByText("That number already has a Housemate account."),
  ).toBeVisible();

  // No number after all: the callout again, then on without texts.
  await phone.fill("");
  await expect(texts).toHaveCount(0);
  await next(page).click();
  await expect(page.getByText("Housemate works best by text.")).toBeVisible();
  await page.waitForTimeout(600);
  await next(page).click();

  // W1, with the email as it was typed.
  const waitlisted = page.getByRole("heading", {
    name: "You’re on the waitlist.",
  });
  await expect(waitlisted).toBeVisible();
  await expect(
    page.getByText(
      "Thanks, River. We’ll email river.waitlst@example.com as soon as a spot opens up.",
    ),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  // "Change it" is G3 again, with everything kept and the email to fix.
  await page.getByRole("button", { name: "Change it" }).click();
  await expect(question(page)).toHaveText("How may we contact you?");
  await expect(email).toHaveValue("river.waitlst@example.com");
  await expect(email).toBeFocused();
  await expect(terms).toBeChecked();

  // Fixed, the entry moves to the right email (ops sees only that one).
  await email.fill("river.waitlist@example.com");
  await next(page).click();
  await expect(next(page)).toHaveText("Continue without texts");
  await page.waitForTimeout(600);
  await next(page).click();
  await expect(waitlisted).toBeVisible();
  await expect(
    page.getByText(
      "Thanks, River. We’ll email river.waitlist@example.com as soon as a spot opens up.",
    ),
  ).toBeVisible();

  // The browser's Back from W1 is G3 too.
  await page.goBack();
  await expect(question(page)).toHaveText("How may we contact you?");
  await expect(email).toHaveValue("river.waitlist@example.com");
  await expect(email).toBeFocused();
  await expect(terms).toBeChecked();
});

test("staff let people in, and see each link when mail is off", async ({
  page,
}) => {
  await signInStaff(page);
  const lettingIn = page.getByRole("term").filter({
    hasText: "Let in, not joined yet",
  });
  const lettingInCount = lettingIn.locator("xpath=following-sibling::dd");
  await expect(lettingInCount).toHaveText("0");

  // River, who just joined, is waiting, once: under the email they fixed.
  await expect(
    page.getByRole("row").filter({ hasText: "river.waitlist@example.com" }),
  ).toContainText("Waiting");
  await expect(
    page.getByRole("row").filter({ hasText: "river.waitlst@example.com" }),
  ).toHaveCount(0);

  // Wren, from the list.
  const wren = page.getByRole("row").filter({ hasText: NEWCOMER.email });
  await expect(wren.first()).toContainText("Waiting");
  await wren.getByRole("button", { name: "Let in" }).click();
  links.wren = await shownLink(page, NEWCOMER.email);
  await expect(wren.first()).toContainText("Not emailed · open until");
  // While the link shows, the row's button is hidden (O5).
  await expect(wren.getByRole("button", { name: "Send again" })).toHaveCount(0);

  // Two emails that aren't on the list, from the toolbar.
  const field = page.getByLabel("Email address to let in");
  const letIn = page
    .locator("form")
    .filter({ has: field })
    .getByRole("button", { name: "Let in" });
  await letIn.click();
  await expect(page.getByText("Enter an email address.")).toBeVisible();
  await expect(field).toBeFocused();

  for (const person of [ALPHA_LINK, ALPHA_SITE]) {
    await field.fill(person.email);
    await letIn.click();
    links[person.email] = await shownLink(page, person.email);
    await expect(field).toHaveValue("");
    await expect(
      page.getByRole("row").filter({ hasText: person.email }).first(),
    ).toContainText("Email only, added here");
  }

  // A member's email is refused.
  await field.fill(MEMBER.email);
  await letIn.click();
  await expect(
    page.getByText("That email already has a Housemate account."),
  ).toBeVisible();

  await expect(lettingInCount).toHaveText("3");
});

test("a link with the details already in goes straight to an emailed code", async ({
  browser,
}) => {
  expect(links.wren).toBeTruthy();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await page.goto(links.wren);
  await expect(question(page)).toHaveText("Welcome to Housemate.");
  const since = new Date();
  await page.getByRole("button", { name: "Let’s get started" }).click();

  // G4 by email: Wren gave no number.
  await expect(question(page)).toHaveText("Check your email…");
  await expectNoSidewaysScroll(page);
  const code = page.getByLabel("Six-digit code");
  await code.fill("000000");
  await expect(
    page.getByText("That code didn’t work. Check it, or send a new one."),
  ).toBeVisible();
  // The digits stay, selected, so typing or pasting replaces them.
  await expect(code).toBeFocused();
  expect(
    await code.evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]),
  ).toEqual([0, 6]);
  // The input is invisible, so the boxes draw the selection on each digit.
  await expect(
    code.locator("xpath=..").locator("div[aria-hidden] > span"),
  ).toHaveCount(6);

  // Back to G3: on a link, the email can't be changed.
  await page.getByRole("button", { name: "Use a different email" }).click();
  await expect(question(page)).toHaveText("How may we contact you?");
  await expect(page.getByLabel("Email")).toHaveValue(NEWCOMER.email);
  await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
  await page.goForward();
  await expect(question(page)).toHaveText("How may we contact you?");

  // On again, still without a number: the callout, then a second Continue.
  await page.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
  await next(page).click();
  await expect(page.getByText("Housemate works best by text.")).toBeVisible();
  await page.waitForTimeout(600);
  await next(page).click();
  await expect(question(page)).toHaveText("Check your email…");

  await code.fill(await emailedCode(NEWCOMER.email, since));
  await expectInApp(page);

  // The link worked once.
  await context.clearCookies();
  await page.goto(links.wren);
  await expect(
    page.getByRole("heading", { name: "This link has expired." }),
  ).toBeVisible();
  await context.close();
});

test("a link with only an email goes through every step, with texts on", async ({
  browser,
}) => {
  expect(links[ALPHA_LINK.email]).toBeTruthy();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await page.goto(links[ALPHA_LINK.email]);
  await page.getByRole("button", { name: "Let’s get started" }).click();
  await expect(question(page)).toHaveText("What’s your name?");
  await page.getByLabel("First name").fill(ALPHA_LINK.firstName);
  await page.getByLabel("Last name").fill("Sample");
  await next(page).click();
  await expect(question(page)).toContainText(
    `Nice to meet you, ${ALPHA_LINK.firstName}.`,
  );
  await pickHome(page);
  await next(page).click();

  // G3 on a link: the email is the link's, read-only.
  await expect(question(page)).toHaveText("How may we contact you?");
  await expect(page.getByLabel("Email")).toHaveValue(ALPHA_LINK.email);
  await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
  await expect(
    page.getByText(
      "We’ll text a code to confirm it. You’ll use it to sign in.",
    ),
  ).toBeVisible();
  await page.getByLabel("Mobile number (optional)").fill(NEW_PHONE);
  const texts = page.getByRole("checkbox", { name: SMS_OPT_IN.label });
  await expect(texts).not.toBeChecked();
  await expect(page.getByText(SMS_OPT_IN.smallPrint)).toBeVisible();
  await texts.check();
  await page.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
  await next(page).click();

  // G4 by text.
  await expect(question(page)).toHaveText("Check your texts…");
  await page.getByLabel("Six-digit code").fill(TEST_CODE);
  await expectInApp(page);
  await context.close();
});

test("someone on the alpha list joins from the website, without a number", async ({
  page,
}) => {
  await page.goto("/get-started");
  await page.getByRole("button", { name: "Let’s get started" }).click();
  await page.getByLabel("First name").fill(ALPHA_SITE.firstName);
  await page.getByLabel("Last name").fill("Sample");
  await next(page).click();
  await pickHome(page);
  await next(page).click();

  await expect(question(page)).toHaveText("How may we contact you?");
  await page.getByLabel("Email").fill(ALPHA_SITE.email);
  await page.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
  await next(page).click();
  await expect(page.getByText("Housemate works best by text.")).toBeVisible();
  await page.waitForTimeout(600);
  const since = new Date();
  await next(page).click();

  // On the alpha list, so a code rather than W1, and the address moves to the
  // link the code belongs to.
  await expect(question(page)).toHaveText("Check your email…");
  await expect(page).toHaveURL(/\/get-started\/[\w-]{43}$/);
  await page
    .getByLabel("Six-digit code")
    .fill(await emailedCode(ALPHA_SITE.email, since));
  await expectInApp(page);
});

test("the new accounts sign in", async ({ page }) => {
  // Wren's email was proven by her link.
  await signIn(page, NEWCOMER.email);
  await expectInApp(page);
  await page.getByRole("button", { name: "Sign out" }).click();

  // Alex confirmed a number.
  await signIn(page, NEW_PHONE);
  await expectInApp(page);
});

/** Searches the fake lookup and picks its Sample Street address (G2). */
async function pickHome(page: Page) {
  const search = page.getByRole("combobox", { name: "Home address" });
  await search.fill("1450 Sample S");
  await page.getByRole("option", { name: /1450 Sample Street/ }).click();
  await expect(search).toHaveValue("1450 Sample Street, Testville, IL 00001");
  await expect(page.getByAltText("Map of 1450 Sample Street")).toBeVisible();
}

/** The link in the panel ops shows when the let-in email didn't go. */
async function shownLink(page: Page, email: string): Promise<string> {
  const field = page.getByLabel(`Get started link for ${email}`);
  await expect(field).toHaveValue(/\/get-started\/[\w-]{43}$/);
  await expect(
    page.getByRole("button", { name: "Copy link" }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Email" }).last(),
  ).toHaveAttribute(
    "href",
    new RegExp(`^mailto:${email.replace(".", "\\.")}\\?subject=A%20spot`),
  );
  return new URL(await field.inputValue()).pathname;
}
