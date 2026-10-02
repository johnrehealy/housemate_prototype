import { expect, test, type Page } from "@playwright/test";
import { MEMBER_STATE, SEED_PHONE } from "./support";

/**
 * The staff-only cost view. Its sums and alert states are proven in
 * packages/core's database tests; these prove the page is staff's alone and
 * that a real exchange lands on it.
 *
 * Nothing leaves the machine: the text goes through the SMS simulator, and the
 * simulator prices every text at a fixed, fake figure.
 */

test.describe("as a member", () => {
  test.use({ storageState: MEMBER_STATE });

  test("the ops pages don't exist", async ({ page }) => {
    for (const path of ["/ops", "/ops/costs"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    }
    await expect(page.getByText("What the pilot is spending")).toHaveCount(0);
  });
});

/** The seeded member's line in the by-member table, as [texts, cost]. */
async function seededMemberLine(page: Page): Promise<[number, string] | null> {
  await page.goto("/ops/costs");
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: "Sam Sample" }) });
  if ((await row.count()) === 0) return null;
  const cells = await row.getByRole("cell").allInnerTexts();
  // The avatar, then Texts, then Cost.
  return [Number(cells[1]?.replaceAll(",", "")), cells.at(-1) ?? ""];
}

test.describe("as staff", () => {
  test("a simulated exchange shows up as the member's cost", async ({
    page,
  }) => {
    const before = (await seededMemberLine(page))?.[0] ?? 0;
    await expect(
      page.getByRole("heading", { name: "What the pilot is spending" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Costs" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // The member texts in, and the worker replies: two texts to price. The
    // local thread keeps every run's texts, so this one is told apart by a
    // tag of its own.
    const body = `What did that cost? ${crypto.randomUUID().slice(0, 8)}`;
    await page.goto("/dev/sms");
    await page.getByLabel("From").fill(SEED_PHONE);
    await page.getByLabel("Message").fill(body);
    await page.getByRole("button", { name: "Send text" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: body }),
    ).toContainText("To Housemate");

    // The worker prices each text a moment after it's handled.
    await expect
      .poll(async () => (await seededMemberLine(page))?.[0] ?? 0, {
        timeout: 20_000,
      })
      .toBeGreaterThanOrEqual(before + 2);

    const line = await seededMemberLine(page);
    expect(line?.[1]).toMatch(/^\$\d+\.\d{2}$/);
    expect(line?.[1]).not.toBe("$0.00");
    await expect(page.getByText(/^Spent in /)).toBeVisible();
  });
});
