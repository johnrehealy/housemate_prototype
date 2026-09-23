"use client";

// From the phone module, not the package barrel: the barrel reaches the Twilio
// SDK, which must never end up in a browser bundle.
import { formatUsPhone } from "@housemate/core/phone";
import { ArrowLeft, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitSignIn } from "./actions";
import { INITIAL_SIGN_IN_STATE, type SignInState } from "./state";

/*
 * The sign-in form (docs/design.md §4 Form controls and Sign-in page, D-036).
 * The classes below are the first shared form controls, so they live here as
 * constants rather than in a components package: §7 Q13 leaves open whether
 * they get their own named tokens, and moving them twice is worse than late.
 */

const FIELD =
  "h-10 w-full rounded-md border px-3 text-base focus:outline-hidden";

/** Resting, hover and focus in one string; error and busy replace it. */
const FIELD_RESTING =
  "border-muted bg-surface text-heading placeholder:text-muted hover:border-body focus:border-evergreen focus:shadow-[inset_0_0_0_1px_var(--color-evergreen)]";
const FIELD_ERROR =
  "border-status-blocked-fg bg-surface text-heading placeholder:text-muted shadow-[inset_0_0_0_1px_var(--color-status-blocked-fg)] focus:border-status-blocked-fg";
const FIELD_BUSY = "border-line bg-nav text-muted placeholder:text-muted";

const PRIMARY_BUTTON =
  "flex h-10 w-full items-center justify-center gap-2 rounded-md bg-evergreen text-label text-on-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-evergreen)] disabled:opacity-60";

/*
 * The 6px focus padding from the comp is always applied and pulled back out
 * with a matching negative margin, so the ring lands exactly where the comp
 * draws it without the label jumping sideways when focus arrives.
 */
const TEXT_BUTTON =
  "-ml-1.5 flex h-9 items-center gap-2 self-start rounded-md px-1.5 text-label text-muted underline-offset-[3px] transition-colors duration-120 ease-out hover:text-body hover:underline hover:decoration-1 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen)] disabled:opacity-60";

const MESSAGE = "flex gap-2 pt-0.5 text-xs";

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
          {phone
            ? // Never confirms that the number is invited: the same sentence
              // is shown whether or not it is (D-050).
              `If ${formatUsPhone(phone)} is on the invite list, a code is on its way.`
            : "We'll text a code to your mobile number."}
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
