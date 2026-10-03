import {
  FINAL_REFUSALS,
  postToAppsScript,
  type AppsScriptConfig,
} from "../apps-script";
import type { WaitlistAlerts, WaitlistJoined } from "./types";

export type AppsScriptAlertsConfig = AppsScriptConfig & {
  retryDelayMs?: number;
};

/**
 * Posts each new signup to the Apps Script attached to the owner's Google
 * Sheet, which adds the row and emails the owner.
 *
 * One retry, after a failure that might be passing. It's safe to repeat: the
 * script skips a signup ID it has already recorded, so a request that timed
 * out here but landed there doesn't make a second row or a second email.
 */
export function createAppsScriptAlerts(
  config: AppsScriptAlertsConfig,
): WaitlistAlerts {
  const retryDelayMs = config.retryDelayMs ?? 1_000;

  return {
    name: "apps-script",
    async joined(signup: WaitlistJoined) {
      const event = {
        event: "waitlist.joined",
        signupId: signup.signupId,
        email: signup.email,
        joinedAt: signup.joinedAt.toISOString(),
      };

      const first = await postToAppsScript(config, event);
      if (first.ok || FINAL_REFUSALS.has(first.reason)) return first;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      return postToAppsScript(config, event);
    },
  };
}
