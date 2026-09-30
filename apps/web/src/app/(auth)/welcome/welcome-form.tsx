"use client";

import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import { Check, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useActionState } from "react";
import {
  TEXT_CONSENT_DISCLOSURE,
  TextConsent,
} from "@/components/text-consent";
import { CHECKBOX, MESSAGE, PRIMARY_BUTTON } from "../form-controls";
import { completeWelcome } from "./actions";
import { INITIAL_WELCOME_STATE } from "./state";

const BOX_ID = "text-consent";

/**
 * The welcome step's one question and its Continue button (docs/design.md §4
 * Welcome step, D-067).
 *
 * The box starts unticked, always: it's a consent (Twilio 30923). When a
 * message comes back, the action says whether it was ticked, and the box takes
 * that as its default. React resets the form after every submission, and a
 * reset restores defaults, so the tick survives; a controlled box would be
 * reset under React's feet and drift from its state.
 */
export function WelcomeForm() {
  const [state, action, pending] = useActionState(
    completeWelcome,
    INITIAL_WELCOME_STATE,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextConsent
        inputId={BOX_ID}
        box={
          <>
            <input
              id={BOX_ID}
              type="checkbox"
              name="textConsent"
              value={SMS_OPT_IN.version}
              defaultChecked={state.ticked ?? false}
              aria-describedby={
                state.consentError
                  ? `${TEXT_CONSENT_DISCLOSURE} consent-message`
                  : TEXT_CONSENT_DISCLOSURE
              }
              className={CHECKBOX}
            />
            <Check
              size={14}
              weight="bold"
              aria-hidden
              className="pointer-events-none absolute inset-0 m-auto hidden text-on-evergreen peer-checked:block"
            />
          </>
        }
        message={
          state.consentError ? (
            <p
              id="consent-message"
              role="alert"
              className={`${MESSAGE} text-status-blocked-fg`}
            >
              <WarningCircle size={20} aria-hidden className="shrink-0" />
              {state.consentError}
            </p>
          ) : null
        }
      />

      <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
        {pending ? (
          <>
            <CircleNotch
              size={20}
              aria-hidden
              className="shrink-0 animate-spin motion-reduce:animate-none"
            />
            Continuing…
          </>
        ) : (
          "Continue"
        )}
      </button>

      {state.error ? (
        <p role="alert" className={`${MESSAGE} text-status-blocked-fg`}>
          <WarningCircle size={20} aria-hidden className="shrink-0" />
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
