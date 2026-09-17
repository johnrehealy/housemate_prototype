import { expect, test } from "@playwright/test";
import { DESTINATIONS } from "./support";

/**
 * The signed-in shell. These reuse the session saved by auth.setup.ts, so they
 * never request a sign-in code of their own.
 */

test("moves between all six destinations", async ({ page }) => {
  await page.goto("/chat");

  for (const { label, path } of DESTINATIONS) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(
      page.getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("matches the design system", async ({ page }) => {
  await page.goto("/chat");

  // Values from docs/design.md §1 Metrics and §4 Navigation item.
  const sidebar = page.locator("aside");
  await expect(sidebar).toHaveCSS("width", "260px");
  await expect(sidebar).toHaveCSS("background-color", "rgb(245, 243, 241)");

  await expect(page.locator("header")).toHaveCSS("height", "64px");

  const chat = page.getByRole("link", { name: "Chat", exact: true });
  const property = page.getByRole("link", { name: "Property", exact: true });

  await expect(chat).toHaveCSS("height", "40px");
  await expect(chat).toHaveCSS("border-radius", "8px");

  // The label is --color-body in every state; ground, border and icon carry it.
  await expect(chat).toHaveCSS("color", "rgb(73, 80, 78)");
  await expect(property).toHaveCSS("color", "rgb(73, 80, 78)");

  // Selected: canvas fill, --color-line border, the selected-state shadow.
  await expect(chat).toHaveCSS("background-color", "rgb(255, 251, 249)");
  await expect(chat).toHaveCSS("border-color", "rgb(236, 232, 229)");
  // Tailwind composes empty ring placeholders ahead of the real shadow, so
  // match the end of the value rather than the whole of it.
  await expect(chat).toHaveCSS(
    "box-shadow",
    /rgba\(20, 52, 47, 0\.05\) 0px 1px 2px 0px$/,
  );

  // Resting: transparent ground, and a transparent border reserving the box.
  await expect(property).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(property).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");

  await expect(chat.locator("svg")).toHaveCSS("color", "rgb(20, 52, 47)");
  await expect(property.locator("svg")).toHaveCSS("color", "rgb(104, 112, 110)");
});
