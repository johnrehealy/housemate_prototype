"use client";

import { useActionState } from "react";
import { submitSignIn } from "./actions";
import { INITIAL_SIGN_IN_STATE } from "./state";

/*
 * The design system has no sign-in page, text field or button (docs/design.md
 * §7). This is built only from existing tokens: the field follows the search
 * bar (36px, surface, hairline), and the button is an evergreen fill at nav
 * item height. The two behaviors the system doesn't cover — a focus ring and a
 * button hover — avoid inventing colors: the ring reuses evergreen, and hover
 * changes opacity rather than introducing a second green.
 */

const field =
  "h-9 w-full rounded-md border border-line bg-surface px-3 text-base text-body placeholder:text-muted focus:border-line-strong focus:outline-2 focus:outline-offset-1 focus:outline-evergreen";

const primaryButton =
  "h-10 w-full rounded-md bg-evergreen text-label text-on-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen disabled:opacity-60";

export function SignInForm() {
  const [state, action, pending] = useActionState(
    submitSignIn,
    INITIAL_SIGN_IN_STATE,
  );
  const onCodeStep = state.step === "code";

  return (
    <div className="w-[380px] max-w-full rounded-lg border border-line bg-surface p-7 shadow-composer">
      <p className="text-sm text-evergreen">Housemate</p>

      <h1 className="mt-6 text-lead text-heading">Sign in</h1>
      <p className="mt-1 text-xs text-muted">
        {onCodeStep
          ? `Enter the code we texted to ${state.phone}.`
          : "We'll text you a code."}
      </p>

      <form action={action} className="mt-6 flex flex-col gap-3">
        {onCodeStep ? (
          <>
            <label htmlFor="code" className="sr-only">
              Six-digit code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              autoFocus
              className={field}
            />
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="submit"
              name="restart"
              value="1"
              className="h-9 rounded-md text-xs text-muted transition-colors duration-120 ease-out hover:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
            >
              Use a different number
            </button>
          </>
        ) : (
          <>
            <label htmlFor="phone" className="sr-only">
              Mobile number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 019-0001"
              autoFocus
              className={field}
            />
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Sending…" : "Send code"}
            </button>
          </>
        )}
      </form>

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-status-blocked-bg px-3 py-2 text-xs text-status-blocked-fg"
        >
          {state.error}
        </p>
      ) : null}

      {state.notice && !state.error ? (
        <p className="mt-4 text-xs text-muted">{state.notice}</p>
      ) : null}
    </div>
  );
}
