import { expect, type Page } from "@playwright/test";

/**
 * Shared pieces for the browser tests.
 *
 * They need the local Supabase stack running and seeded (see
 * playwright.config.ts). Codes come from [auth.sms.test_otp], so nothing is
 * ever texted.
 */

export const SEED_PHONE = "(555) 019-0001";
/** The seeded staff member, who alone can open the ops pages. */
export const STAFF_PHONE = "(555) 019-0002";
export const UNINVITED_PHONE = "(555) 999-9999";

/** The fixed local code, from [auth.sms.test_otp] in supabase/config.toml. */
export const TEST_CODE = "123456";

/** Where the signed-in session is saved, so the shell tests reuse one sign-in. */
export const MEMBER_STATE = "apps/web/e2e/.auth/member.json";
export const STAFF_STATE = "apps/web/e2e/.auth/staff.json";

export const DESTINATIONS = [
  { label: "Chat", path: "/chat" },
  { label: "To do", path: "/todo" },
  { label: "Schedule", path: "/schedule" },
  { label: "Services", path: "/services" },
  { label: "Errands", path: "/errands" },
  { label: "Property", path: "/property" },
] as const;

/**
 * Signs the seeded member in, or anyone else seeded, by their number.
 *
 * Supabase throttles code requests per number, so the suite signs in as rarely
 * as it can: the shell tests reuse the session saved by auth.setup.ts rather
 * than calling this.
 *
 * There is no "Sign in" button on the code step (D-036): the sixth digit
 * submits the form on its own, so filling the field is the whole action.
 */
export async function signIn(page: Page, phone: string = SEED_PHONE) {
  await page.goto("/sign-in");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Six-digit code").fill(TEST_CODE);
  await expect(page).toHaveURL(/\/chat$/);
}
