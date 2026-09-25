export type ActionErrorCode =
  | "invalid_input"
  | "not_found"
  | "quiet_hours"
  | "member_cap"
  | "conflict"
  /** Not a failure: the provider hasn't priced a message yet. Ask again later. */
  | "price_pending";

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
