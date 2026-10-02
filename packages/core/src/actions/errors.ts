export type ActionErrorCode =
  | "invalid_input"
  | "not_found"
  | "quiet_hours"
  | "member_cap"
  | "conflict"
  /**
   * Saved details are missing or were agreed under Terms or texts wording
   * that has since changed, so the person must go through them again.
   */
  | "stale_details";

/** An action refused to run. `code` says why, so callers can respond in kind. */
export class ActionError extends Error {
  readonly code: ActionErrorCode;

  constructor(
    code: ActionErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ActionError";
    this.code = code;
  }
}
