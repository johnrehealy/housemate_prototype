/*
 * The welcome step's form state. It lives apart from actions.ts because a
 * "use server" file may export only async functions, and the form needs the
 * initial state too.
 */

export type WelcomeState = {
  /**
   * Whether the box was ticked when the form came back with a message. React
   * resets the form after every submission, and the reset restores each
   * input's default, so the box takes this as its default to keep the tick.
   */
  ticked?: boolean;
  /** Shown under the consent copy: the wording changed since the page loaded. */
  consentError?: string;
  /** Shown under the button: nothing was finished, so Continue can be retried. */
  error?: string;
};

export const INITIAL_WELCOME_STATE: WelcomeState = {};
