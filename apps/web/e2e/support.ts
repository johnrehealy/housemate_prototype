import { expect, type Page } from "@playwright/test";

/**
 * Shared pieces for the browser tests.
 *
 * They need the local Supabase stack running, reset and seeded (see
 * playwright.config.ts). The accounts are the generated ones in
 * packages/core/scripts/seed-local.ts. Nothing is ever really sent: texted
 * codes are [auth.sms.test_otp] in supabase/config.toml, and emailed ones land
 * in the stack's mail catcher, Mailpit.
 */

/** Sam, the seeded member, whose email the let-in link proved. */
export const MEMBER = {
  email: "sam@example.com",
  phone: "(555) 019-0001",
};

/** Olly, the seeded staff member who runs /ops. */
export const STAFF = {
  phone: "(555) 019-0002",
};

/**
 * Wren, the seeded waitlist entry: name and home filled in, no number, not let
 * in yet. The Get started tests use her up, and the number below, so they need
 * a freshly seeded database, as CI always has.
 */
export const NEWCOMER = {
  email: "wren@example.com",
  firstName: "Wren",
};

/** The number Get started joins with, kept free by the seed. */
export const NEW_PHONE = "(555) 019-0003";

/** The fixed local code, from [auth.sms.test_otp] in supabase/config.toml. */
export const TEST_CODE = "123456";

/** Where the signed-in session is saved, so the shell tests reuse one sign-in. */
export const MEMBER_STATE = "apps/web/e2e/.auth/member.json";

/** Mailpit's API, from [inbucket] in supabase/config.toml. */
const MAILPIT = "http://127.0.0.1:54324/api/v1";

export const DESTINATIONS = [
  { label: "Chat", path: "/chat" },
  { label: "To do", path: "/todo" },
  { label: "Schedule", path: "/schedule" },
  { label: "Services", path: "/services" },
  { label: "Errands", path: "/errands" },
  { label: "Property", path: "/property" },
] as const;

/**
 * The code in the newest email to `to` that arrived after `since`. Polls,
 * because Supabase hands the email to Mailpit a moment after the page moves
 * on.
 */
export async function emailedCode(to: string, since: Date): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT}/search?limit=1&query=${encodeURIComponent(`to:"${to}"`)}`,
        ).then((response) => response.json());
        const latest = search.messages?.[0];
        if (!latest || new Date(latest.Created) <= since) return undefined;
        const message = await fetch(`${MAILPIT}/message/${latest.ID}`).then(
          (response) => response.json(),
        );
        code = /\b(\d{6})\b/.exec(message.Text ?? "")?.[1];
        return code;
      },
      { message: `an emailed code for ${to}` },
    )
    .toMatch(/^\d{6}$/);
  return code as string;
}

const lastSent = new Map<string, number>();

/**
 * Waits until a code can go to `to` again. Supabase sends each number or
 * email one code a second at most (max_frequency in supabase/config.toml) and
 * refuses the next one sooner, and the tests are quicker than that.
 */
export async function waitToSend(page: Page, to: string) {
  const wait = (lastSent.get(to) ?? 0) + 1100 - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  lastSent.set(to, Date.now());
}

/** Asks sign-in for a code (S1) and waits for the code step (S2). */
export async function requestSignInCode(page: Page, identifier: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number or email").fill(identifier);
  await waitToSend(page, identifier);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
}

/**
 * Signs in by a texted code, or an emailed one read from Mailpit (D-073). The
 * sixth digit submits.
 */
export async function signIn(page: Page, identifier: string) {
  const since = new Date();
  await requestSignInCode(page, identifier);
  const code = identifier.includes("@")
    ? await emailedCode(identifier, since)
    : TEST_CODE;
  await page.getByLabel("Six-digit code").fill(code);
}

/**
 * Waits for the app itself, not just its address: a visitor who isn't
 * signed in passes through /chat on their way to sign-in.
 */
export async function expectInApp(page: Page) {
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
}

/** Signs Sam in by number and waits for the app. */
export async function signInMember(page: Page) {
  await signIn(page, MEMBER.phone);
  await expectInApp(page);
}

/** Signs Olly in and waits for ops. */
export async function signInStaff(page: Page) {
  await signIn(page, STAFF.phone);
  await expect(page).toHaveURL(/\/ops\/waitlist$/);
}

/** Checks nothing on the page scrolls sideways at the current width. */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
