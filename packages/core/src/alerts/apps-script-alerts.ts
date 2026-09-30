import type { AlertResult, WaitlistAlerts, WaitlistJoined } from "./types";

export type AppsScriptAlertsConfig = {
  /** The script's web app URL (Deploy → Web app). */
  url: string;
  /** The same value as the script's `SECRET` property. */
  secret: string;
  /** Tests pass their own; everywhere else it's the global fetch. */
  fetch?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
};

/*
 * Refusals the script makes on purpose. Sending the same request again can't
 * change them, so they aren't retried: the secret or the deployment is wrong,
 * or the row is saved and only the email failed.
 */
const FINAL = new Set([
  "unauthorized",
  "bad_request",
  "no_sheet",
  "email_failed",
]);

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
  const send = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs ?? 10_000;
  const retryDelayMs = config.retryDelayMs ?? 1_000;

  async function attempt(body: string): Promise<AlertResult> {
    try {
      // Apps Script answers a POST with a redirect to the result, which fetch
      // follows as a GET. That is how its web apps are meant to be called.
      const response = await send(config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) return { ok: false, reason: `http_${response.status}` };

      // Apps Script always answers 200, so the outcome is in the body. An
      // error in the script comes back as an HTML page instead of JSON.
      const reply: unknown = await response.json().catch(() => null);
      if (isReply(reply)) {
        return reply.ok
          ? { ok: true }
          : { ok: false, reason: reply.error ?? "refused" };
      }
      return { ok: false, reason: "unexpected_reply" };
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof Error && error.name === "TimeoutError"
            ? "timeout"
            : "network",
      };
    }
  }

  return {
    name: "apps-script",
    async joined(signup: WaitlistJoined) {
      const body = JSON.stringify({
        secret: config.secret,
        event: "waitlist.joined",
        signupId: signup.signupId,
        email: signup.email,
        joinedAt: signup.joinedAt.toISOString(),
      });

      const first = await attempt(body);
      if (first.ok || FINAL.has(first.reason)) return first;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      return attempt(body);
    },
  };
}

function isReply(value: unknown): value is { ok: boolean; error?: string } {
  if (typeof value !== "object" || value === null) return false;
  const reply = value as Record<string, unknown>;
  return (
    typeof reply.ok === "boolean" &&
    (reply.error === undefined || typeof reply.error === "string")
  );
}
