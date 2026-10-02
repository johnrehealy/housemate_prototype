/**
 * The sign-in form's state, shared by the form and the server action.
 *
 * It lives here rather than in actions.ts because a "use server" file may only
 * export async functions: exporting anything else compiles, then fails at
 * runtime for every request that touches the module.
 */
export type SignInState =
  | {
      step: "who";
      /** What was typed, so a failed attempt or "Use a different…" keeps it. */
      identifier?: string;
      error?: string;
    }
  | {
      step: "code";
      identifier: string;
      channel: "sms" | "email";
      /** The number in E.164, or the email, the code went to. */
      to: string;
      /** Codes sent so far; a new one restarts the code step. */
      sends: number;
      error?: string;
    };

export const INITIAL_SIGN_IN_STATE: SignInState = { step: "who" };

export const WRONG_CODE = "That code didn’t work. Check it, or send a new one.";
