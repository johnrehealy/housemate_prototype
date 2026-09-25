import { test as setup } from "@playwright/test";
import { MEMBER_STATE, STAFF_PHONE, STAFF_STATE, signIn } from "./support";

/** Signs in once, so the tests that only need a signed-in member reuse it. */
setup("sign in and save the session", async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: MEMBER_STATE });
});

/** The same for the seeded staff member, for the ops pages. */
setup("sign in as staff and save the session", async ({ page }) => {
  await signIn(page, STAFF_PHONE);
  await page.context().storageState({ path: STAFF_STATE });
});
