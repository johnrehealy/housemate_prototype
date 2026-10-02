/**
 * Calls the Apps Script web app attached to the owner's Google Sheet
 * (`scripts/waitlist-alerts`), which sends Housemate's waitlist alerts and
 * emails as john@myhousemate.co. Behind our own interfaces (`WaitlistAlerts`,
 * `Mailer`), so another sender can replace it without touching the callers.
 */

export type AppsScriptConfig = {
  /** The script's web app URL (Deploy → Web app). */
  url: string;
  /** The same value as the script's `SECRET` property. */
  secret: string;
  /** Tests pass their own; everywhere else it's the global fetch. */
  fetch?: typeof fetch;
  timeoutMs?: number;
};

/**
 * What became of a request. `reason` is a short code for the log, and never
 * contains an address, a link or a code.
 */
export type AppsScriptResult = { ok: true } | { ok: false; reason: string };

/*
 * Refusals the script makes on purpose. Sending the same request again can't
 * change them: the secret or the deployment is wrong, or the email failed.
 */
export const FINAL_REFUSALS = new Set([
  "unauthorized",
  "bad_request",
  "no_sheet",
  "email_failed",
]);

/** Posts one event, with the secret, and reads the script's JSON answer. */
export async function postToAppsScript(
  config: AppsScriptConfig,
  event: Record<string, unknown> & { event: string },
): Promise<AppsScriptResult> {
  const send = config.fetch ?? fetch;
  try {
    // Apps Script answers a POST with a redirect to the result, which fetch
    // follows as a GET. That is how its web apps are meant to be called.
    const response = await send(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secret, ...event }),
      redirect: "follow",
      signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
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

function isReply(value: unknown): value is { ok: boolean; error?: string } {
  if (typeof value !== "object" || value === null) return false;
  const reply = value as Record<string, unknown>;
  return (
    typeof reply.ok === "boolean" &&
    (reply.error === undefined || typeof reply.error === "string")
  );
}
