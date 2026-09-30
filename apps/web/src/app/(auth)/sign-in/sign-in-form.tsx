"use client";

// From the phone module, not the package barrel: the barrel reaches the Twilio
// SDK, which must never end up in a browser bundle.
import { formatUsPhone } from "@housemate/core/phone";
import { ArrowLeft, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  FIELD,
  FIELD_BUSY,
  FIELD_ERROR,
  FIELD_RESTING,
  MESSAGE,
  PRIMARY_BUTTON,
  TEXT_BUTTON,
} from "../form-controls";
import { submitSignIn } from "./actions";
import { INITIAL_SIGN_IN_STATE, type SignInState } from "./state";

/*
 * The sign-in form (docs/design.md §4 Form controls and Sign-in page, D-036).
 * The control classes are shared with the welcome step, in form-controls.ts.
 */

const CODE_HINT = "You'll be signed in as soon as all six digits are in.";

type StepProps = {
  state: SignInState;
  action: (formData: FormData) => void;
  pending: boolean;
};

export function SignInForm() {
  const [state, action, pending] = useActionState(
    submitSignIn,
    INITIAL_SIGN_IN_STATE,
  );
  const phone = state.step === "code" ? state.phone : undefined;

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-8 lg:w-[360px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-display text-heading">
          {phone ? "Enter your code" : "Sign in"}
        </h1>
        {/*
         * Described by both fields. The code step mounts with focus already in
         * the input, so without this a screen-reader member would land on a
         * field labelled "Six-digit code" having never been told that a code
         * was sent, or to which number.
         */}
        <p id="sign-in-helper" className="text-label text-muted">
          {phone ? (
            // Never confirms that the number is invited: the same sentence is
            // shown whether or not it is (D-050). Narrow widths use the short
            // form the user chose for them (D-057). The hidden one is
            // display:none, so a screen reader only ever reads one.
            <>
              <span className="lg:hidden">A code is on its way.</span>
              <span className="hidden lg:inline">
                If {formatUsPhone(phone)} is on the invite list, a code is on
                its way.
              </span>
            </>
          ) : (
            "We'll text a code to your mobile number."
          )}
        </p>
      </div>

      {phone ? (
        <CodeStep state={state} action={action} pending={pending} />
      ) : (
        <PhoneStep state={state} action={action} pending={pending} />
      )}
    </div>
  );
}

function PhoneStep({ state, action, pending }: StepProps) {
  const invalid = Boolean(state.error);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-xs text-body">
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
          aria-invalid={invalid || undefined}
          aria-describedby={
            invalid ? "sign-in-helper phone-message" : "sign-in-helper"
          }
          className={`${FIELD} ${invalid ? FIELD_ERROR : FIELD_RESTING}`}
        />
        {invalid ? (
          <p
            id="phone-message"
            role="alert"
            className={`${MESSAGE} text-status-blocked-fg`}
          >
            <WarningCircle size={20} aria-hidden className="shrink-0" />
            {state.error}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
        {pending ? (
          <>
            <CircleNotch
              size={20}
              aria-hidden
              className="shrink-0 animate-spin motion-reduce:animate-none"
            />
            Sending…
          </>
        ) : (
          "Send code"
        )}
      </button>
    </form>
  );
}

function CodeStep({ state, action, pending }: StepProps) {
  const [digits, setDigits] = useState("");
  const field = useRef<HTMLInputElement>(null);
  // The digits already sent, so a rejected code doesn't resubmit itself in a
  // loop once it comes back and the field still holds six of them.
  const submitted = useRef<string | null>(null);
  const invalid = Boolean(state.error);

  // Submitting from an effect, not from onChange, so the input's DOM value is
  // the stripped one by the time the form is read. A pasted "123 456" would
  // otherwise be posted with its space still in.
  useEffect(() => {
    if (digits.length < 6) {
      // They've edited, so the same six digits may legitimately be sent again.
      submitted.current = null;
      return;
    }
    if (digits === submitted.current) return;
    submitted.current = digits;
    field.current?.form?.requestSubmit();
  }, [digits]);

  // After a wrong code the digits stay selected, so typing replaces them.
  useEffect(() => {
    if (!state.error) return;
    field.current?.focus();
    field.current?.select();
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      {/*
       * The code form holds only the input. With no submit button in it,
       * pressing Enter still posts it (HTML's implicit submission), so the
       * step works with JavaScript off, and "Use a different number" can't be
       * what Enter reaches for.
       */}
      <form action={action} className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-xs text-body">
          Six-digit code
        </label>
        <input
          id="code"
          name="code"
          ref={field}
          value={digits}
          onChange={(event) =>
            setDigits(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          // readOnly rather than disabled: a disabled input leaves the tab
          // order and throws away focus mid-flow. The look is the same.
          // No aria-disabled to go with it — the field is still focusable and
          // its value is still submitted, so calling it disabled would be
          // untrue. The "Signing you in…" status line below says what's
          // happening, and it's in aria-describedby.
          readOnly={pending}
          aria-invalid={invalid || undefined}
          aria-describedby="sign-in-helper code-message"
          className={`${FIELD} tracking-wide selection:bg-evergreen/12 ${
            pending ? FIELD_BUSY : invalid ? FIELD_ERROR : FIELD_RESTING
          }`}
        />
        {invalid && !pending ? (
          <p
            id="code-message"
            role="alert"
            className={`${MESSAGE} text-status-blocked-fg`}
          >
            <WarningCircle size={20} aria-hidden className="shrink-0" />
            {state.error}
          </p>
        ) : pending ? (
          <p id="code-message" role="status" className={`${MESSAGE} text-body`}>
            <CircleNotch
              size={20}
              aria-hidden
              className="shrink-0 animate-spin text-evergreen motion-reduce:animate-none"
            />
            Signing you in…
          </p>
        ) : (
          // The hint ships with the auto-submit, not as decoration: WCAG 3.2.2
          // allows a change of context on input only when the member is told
          // beforehand.
          //
          // role="status" here as well as on the working line, even though the
          // hint never changes: React reuses this <p> across the two, so a role
          // that only arrives with "Signing you in…" would make the region live
          // in the same commit as its own text, which NVDA and VoiceOver don't
          // announce. Live from the first render, the swap is a content change.
          <p
            id="code-message"
            role="status"
            className={`${MESSAGE} text-muted`}
          >
            {CODE_HINT}
          </p>
        )}
      </form>

      <form action={action}>
        <input type="hidden" name="restart" value="1" />
        <button type="submit" disabled={pending} className={TEXT_BUTTON}>
          <ArrowLeft size={20} aria-hidden className="shrink-0" />
          Use a different number
        </button>
      </form>
    </div>
  );
}
