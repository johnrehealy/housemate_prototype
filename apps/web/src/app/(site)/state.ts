/**
 * The waitlist form's state, shared by the form and the server action.
 *
 * It lives here rather than in actions.ts because a "use server" file may only
 * export async functions: exporting anything else compiles, then fails at
 * runtime for every request that touches the module.
 */
export type WaitlistState = {
  /** "joined" is the answer to every address, whether or not it was new. */
  status: "idle" | "joined";
  error?: string;
};

export const INITIAL_WAITLIST_STATE: WaitlistState = { status: "idle" };
