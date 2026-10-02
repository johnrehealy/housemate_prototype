import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import { expect, test } from "@playwright/test";

/**
 * The privacy policy, the terms, the texts page and the contact page. These
 * start signed out (the `signed-out` project in playwright.config.ts):
 * Twilio's reviewers read the first three to approve the texting
 * registration, so they must never bounce a visitor to sign-in.
 */

const PAGES = [
  {
    path: "/privacy",
    title: "Privacy Policy",
    heading: "Privacy Policy",
    link: "Privacy",
  },
  {
    path: "/terms",
    title: "Terms of Service",
    heading: "Terms of Service",
    link: "Terms",
  },
  {
    path: "/texts",
    title: "Texts",
    heading: "Texts from Housemate",
    link: "Texts",
  },
  {
    path: "/contact",
    title: "Contact",
    heading: "Get in touch",
    link: "Contact",
  },
] as const;

for (const { path, title, heading } of PAGES) {
  test(`${path} opens for a signed-out visitor`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page).toHaveTitle(`${title} · Housemate`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    // The page being read is the footer link at full strength.
    await expect(
      page.getByRole("contentinfo").locator('a[aria-current="page"]'),
    ).toHaveAttribute("href", path);
  });

  test(`${path} has nothing to scroll sideways at 390`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the privacy policy says what Twilio's reviewers look for", async ({
  page,
}) => {
  await page.goto("/privacy");
  const messaging = page.locator("#text-messaging");
  for (const text of [
    "Housemate, operated by John Healy (sole proprietor).",
    "Message frequency varies",
    "Message and data rates may apply",
    "Reply STOP at any time.",
    "Reply HELP, or email john@myhousemate.co.",
    "We do not share, sell, rent, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing or promotional purposes.",
    "Text-messaging originator opt-in data and consent are not shared with any third parties.",
  ]) {
    await expect(messaging.getByText(text).first()).toBeVisible();
  }
  await expect(
    messaging.getByRole("link", { name: "Terms" }).first(),
  ).toHaveAttribute("href", "/terms");
});

test("the texts page shows Get started's boxes with the words members see", async ({
  page,
}) => {
  await page.goto("/texts");
  const specimen = page.getByRole("figure");
  await expect(specimen).toContainText(
    "What you’ll see when you add a mobile number",
  );
  // Read from the same constant Get started renders, so the public copy can't
  // drift from what members actually agree to.
  await expect(specimen.getByText(SMS_OPT_IN.label)).toBeVisible();
  await expect(specimen.getByText(SMS_OPT_IN.smallPrint)).toBeVisible();
  await expect(specimen.getByText("Mobile number (optional)")).toBeVisible();
  const terms = specimen.locator("p", { hasText: "I agree to the Terms" });
  await expect(terms).toBeVisible();
  await expect(terms.getByRole("link", { name: /^Terms/ })).toHaveAttribute(
    "href",
    "/terms",
  );
  await expect(
    terms.getByRole("link", { name: /^Privacy Policy/ }),
  ).toHaveAttribute("href", "/privacy");
  // A picture of the step, not a second place to agree.
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(specimen.getByRole("button")).toHaveCount(0);

  // The way in (D-072, D-074).
  for (const step of [
    "You join the waitlist",
    "You choose whether to get texts",
    "We email you when there’s a place",
    "You confirm it’s you",
  ]) {
    await expect(page.getByText(step)).toBeVisible();
  }

  const card = page.getByRole("region", { name: "How Housemate texts" });
  for (const text of [
    "Housemate, operated by John Healy (sole proprietor).",
    "Only members who tick “Text me about my home” when they join. Texting is optional.",
    "Sent to confirm your number when you set up your account, and when you sign in. Without a number, codes come by email. A code doesn’t sign you up for other texts.",
    "Message and data rates may apply.",
    "Reply STOP at any time.",
  ]) {
    await expect(card.getByText(text)).toBeVisible();
  }

  await page.getByRole("link", { name: "Join the waitlist" }).last().click();
  await expect(page).toHaveURL(/\/get-started$/);
});

test("the landing page's footer reaches every page", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const { path, heading, link } of PAGES) {
    await footer.getByRole("link", { name: link }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await page.goto("/");
  }
});

test("the contents mark the section being read", async ({ page }) => {
  await page.goto("/privacy");
  const contents = page.getByRole("navigation", { name: "Contents" });
  await contents.getByRole("link", { name: /Text messaging/ }).click();
  await expect(page).toHaveURL(/#text-messaging$/);
  await expect(contents.locator('[aria-current="location"]')).toHaveText(
    /Text messaging/,
  );
  // The heading lands clear of the sticky ribbon, not under it.
  const top = await page
    .getByRole("heading", { name: "Text messaging", level: 2 })
    .evaluate((heading) => heading.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(64);
});

test("on a phone the contents open from the bar and close on a choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/privacy");
  const toggle = page.getByRole("button", { name: /Contents/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("navigation", { name: "Contents" })
    .getByRole("link", { name: /How we protect it/ })
    .click();
  await expect(page).toHaveURL(/#security$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText("10 · How we protect it");
});
