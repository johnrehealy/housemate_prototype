"use client";

// From the phone module, not the package barrel: the barrel reaches the Twilio
// SDK, which must never end up in a browser bundle.
import { formatUsPhone } from "@housemate/core/phone";
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ResendNotice,
  ResendRow,
  useResendCountdown,
} from "@/components/onboarding/resend";
import { FrameHeading } from "../centered-frame";
import { FieldMessage } from "../field-message";
import {
  FIELD,
  FIELD_BUSY,
  FIELD_ERROR,
  FIELD_RESTING,
  MESSAGE,
  PRIMARY_BUTTON,
  TEXT_BUTTON,
} from "../form-controls";
import { signIn } from "./actions";
import { INITIAL_SIGN_IN_STATE, type SignInState } from "./state";

/*
 * Sign-in (docs/design.md §4 Sign-in page, boards S1 and S2, D-073): a mobile
 * number or email, then the code texted or emailed to it. The sixth digit
 * submits.
 */

const LABEL = "text-xs text-body";

type CodeState = Extract<SignInState, { step: "code" }>;

export function SignInForm() {
  const [state, action, pending] = useActionState(
    signIn,
    INITIAL_SIGN_IN_STATE,
  );
  // What the pending request is, so only checking a code says "Checking…".
  const [working, setWorking] = useState<"code" | "resend" | "restart">();
  const countdown = useResendCountdown();

  // Each new code restarts the count. Set while rendering, as React suggests
  // for state that follows a change in other state.
  const sends = state.step === "code" ? state.sends : 0;
  const [seenSends, setSeenSends] = useState(sends);
  if (sends !== seenSends) {
    setSeenSends(sends);
    if (sends > 1) countdown.start();
    else countdown.stop();
  }

  function dispatch(intent: "resend" | "restart") {
    setWorking(intent);
    const formData = new FormData();
    formData.set("intent", intent);
    startTransition(() => action(formData));
  }

  return (
    <>
      <ResendNotice sent={state.step === "code" && countdown.resendIn > 0} />
      {state.step === "who" ? (
        <WhoStep
          state={state}
          action={action}
          pending={pending}
          onSubmit={() => setWorking(undefined)}
        />
      ) : (
        <CodeStep
          // A new code starts with empty digits, focused.
          key={state.sends}
          state={state}
          action={action}
          pending={pending}
          checking={pending && working === "code"}
          resendIn={countdown.resendIn}
          onSubmit={() => setWorking("code")}
          onResend={() => dispatch("resend")}
          onDifferent={() => dispatch("restart")}
        />
      )}
    </>
  );
}

function Working({ label }: { label: string }) {
  return (
    <>
      <CircleNotch
        size={20}
        aria-hidden
        className="shrink-0 animate-spin motion-reduce:animate-none"
      />
      {label}
    </>
  );
}

function WhoStep({
  state,
  action,
  pending,
  onSubmit,
}: {
  state: Extract<SignInState, { step: "who" }>;
  action: (formData: FormData) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  const invalid = Boolean(state.error) && !pending;
  return (
    <>
      <FrameHeading title="Sign in" />
      <form
        action={action}
        onSubmit={onSubmit}
        className="mt-8 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="identifier" className={LABEL}>
            Mobile number or email
          </label>
          <input
            // Remounted with each result, so what was typed is kept; React
            // clears a form's fields after its action runs.
            key={`identifier-${state.identifier ?? ""}-${state.error ?? ""}`}
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.identifier}
            autoFocus
            readOnly={pending}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "identifier-message" : undefined}
            className={`${FIELD} ${
              pending ? FIELD_BUSY : invalid ? FIELD_ERROR : FIELD_RESTING
            }`}
          />
          <FieldMessage
            id="identifier-message"
            error={invalid ? state.error : undefined}
          />
        </div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? <Working label="Sending…" /> : "Send me a code"}
        </button>
      </form>
      <p className="mt-8 text-xs text-muted">
        New to Housemate?{" "}
        <Link
          href="/get-started"
          className="rounded-sm text-evergreen underline decoration-1 underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
        >
          Join the waitlist
        </Link>
        .
      </p>
    </>
  );
}

function CodeStep({
  state,
  action,
  pending,
  checking,
  resendIn,
  onSubmit,
  onResend,
  onDifferent,
}: {
  state: CodeState;
  action: (formData: FormData) => void;
  pending: boolean;
  checking: boolean;
  resendIn: number;
  onSubmit: () => void;
  onResend: () => void;
  onDifferent: () => void;
}) {
  const [digits, setDigits] = useState("");
  const field = useRef<HTMLInputElement>(null);
  // The digits already sent, so a rejected code doesn't resubmit itself.
  const submitted = useRef<string | null>(null);
  const invalid = Boolean(state.error) && !pending;
  const sms = state.channel === "sms";

  // Submitted from an effect, not onChange, so the form reads the stripped
  // digits: a pasted "123 456" would otherwise be posted with its space.
  useEffect(() => {
    if (digits.length < 6) {
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
    <>
      <FrameHeading
        title={sms ? "Check your texts" : "Check your email"}
        // Never says whether there's an account (D-073).
        helper={
          sms
            ? `If ${formatUsPhone(state.to)} has an account, we’ve texted it a code.`
            : `If ${state.to} has an account, we’ve emailed it a code.`
        }
        helperId="code-helper"
      />
      <form action={action} onSubmit={onSubmit} className="mt-8 flex flex-col">
        <label htmlFor="code" className={`${LABEL} mb-1.5`}>
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
          readOnly={pending}
          aria-invalid={invalid || undefined}
          aria-describedby="code-helper code-message"
          className={`${FIELD} tracking-wide selection:bg-evergreen/12 ${
            pending ? FIELD_BUSY : invalid ? FIELD_ERROR : FIELD_RESTING
          }`}
        />
        {invalid ? (
          <div className="mt-1.5">
            <FieldMessage id="code-message" error={state.error} />
          </div>
        ) : (
          // Live from the first render, so the swap to "Checking…" is heard.
          // Empty, it takes no room: the resend row sits 16px under the field.
          <p
            id="code-message"
            role="status"
            className={`${MESSAGE} ${checking ? "mt-1.5" : ""} text-body`}
          >
            {checking ? (
              <>
                <CircleNotch
                  size={20}
                  aria-hidden
                  className="shrink-0 animate-spin text-evergreen motion-reduce:animate-none"
                />
                Checking…
              </>
            ) : null}
          </p>
        )}
      </form>
      <div className="mt-4 flex flex-col gap-1">
        <ResendRow resendIn={resendIn} busy={pending} onResend={onResend} />
        <button
          type="button"
          onClick={onDifferent}
          disabled={pending}
          className={TEXT_BUTTON}
        >
          <ArrowLeft size={20} aria-hidden className="shrink-0" />
          {sms ? "Use a different number" : "Use a different email"}
        </button>
      </div>
    </>
  );
}
