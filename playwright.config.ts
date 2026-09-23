import { defineConfig, devices } from "@playwright/test";
import { MEMBER_STATE, STAFF_STATE } from "./apps/web/e2e/support";

const baseURL = "http://127.0.0.1:3000";

// The design system is specified at 1440 x 900 (docs/design.md §1).
const desktop = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
};

/**
 * Browser tests for the web app.
 *
 * They need the local Supabase stack running and seeded:
 *   pnpm db:start && pnpm db:reset && pnpm db:seed
 *
 * They start the web app and the worker themselves, or reuse ones already
 * running on ports 3000 and 8080.
 *
 * Sign-in codes come from [auth.sms.test_otp] in supabase/config.toml, so no
 * text is ever sent.
 */
export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  // One worker: these tests share one seeded member.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: desktop,
    },
    {
      // Sign-in's own tests start signed out.
      name: "signed-out",
      testMatch: /sign-in\.spec\.ts/,
      use: desktop,
    },
    {
      // Supabase throttles code requests per number, so everything that just
      // needs a signed-in member reuses one saved session instead of signing
      // in again.
      name: "signed-in",
      testMatch: /(app-shell|messaging)\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...desktop, storageState: MEMBER_STATE },
    },
    {
      // The ops pages are staff's alone. Their spec signs in as staff, and
      // switches to the member's session to prove a member can't see them.
      name: "staff",
      testMatch: /ops\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...desktop, storageState: STAFF_STATE },
    },
    // Screenshots for the Impeccable finish review, which won't give a verdict
    // without captures on disk. They write files rather than assert, so they
    // stay out of the normal run and CI: `CAPTURE=1 pnpm exec playwright test`.
    ...(process.env.CAPTURE
      ? [{ name: "capture", testMatch: /capture\.spec\.ts/, use: desktop }]
      : []),
  ],
  webServer: [
    {
      // A production build, not `next dev`. The dev server watches the whole
      // tree, which runs macOS out of file descriptors (EMFILE) and restarts
      // mid-test, and it isn't what staging or CI serve anyway.
      command:
        "pnpm --filter @housemate/web build && pnpm --filter @housemate/web start",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // The worker answers simulated texts. Its health check turns 200 once
      // the job loop is running. Stopped with SIGTERM, as a host would.
      command: "pnpm --filter @housemate/worker start",
      url: "http://127.0.0.1:8080/health",
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
      timeout: 60_000,
    },
  ],
});
