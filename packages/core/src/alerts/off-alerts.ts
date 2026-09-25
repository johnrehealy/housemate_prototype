import type { WaitlistAlerts } from "./types";

/**
 * Sends nothing. Everywhere the alert isn't configured — local development,
 * tests, CI and previews — so none of them can reach the real sheet.
 */
export function createOffAlerts(): WaitlistAlerts {
  return {
    name: "off",
    async joined() {
      return { ok: true };
    },
  };
}
