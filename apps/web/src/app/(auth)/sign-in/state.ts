/**
 * The sign-in form's state, shared by the form and the server action.
 *
 * It lives here rather than in actions.ts because a "use server" file may only
 * export async functions: exporting anything else compiles, then fails at
 * runtime for every request that touches the module.
 */
export type SignInState = {
  step: "phone" | "code";
  /** Set once a code has been requested, so the verify step knows the number. */
  phone?: string;
  error?: string;
  notice?: string;
};

export const INITIAL_SIGN_IN_STATE: SignInState = { step: "phone" };
