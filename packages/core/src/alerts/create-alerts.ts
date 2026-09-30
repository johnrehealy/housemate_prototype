import type { ServerEnv } from "../env";
import { createAppsScriptAlerts } from "./apps-script-alerts";
import { createOffAlerts } from "./off-alerts";
import type { WaitlistAlerts } from "./types";

/**
 * Picks the waitlist alert for this environment: the Apps Script where both
 * keys are set (production only), and nothing everywhere else.
 */
export function createWaitlistAlerts(
  env: Pick<ServerEnv, "WAITLIST_ALERT_URL" | "WAITLIST_ALERT_SECRET">,
): WaitlistAlerts {
  const { WAITLIST_ALERT_URL: url, WAITLIST_ALERT_SECRET: secret } = env;
  // loadServerEnv already refuses one without the other.
  if (!url || !secret) return createOffAlerts();
  return createAppsScriptAlerts({ url, secret });
}
