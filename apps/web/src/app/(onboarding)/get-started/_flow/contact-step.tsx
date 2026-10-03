"use client";

import { toEmail } from "@housemate/core/email";
import { toE164 } from "@housemate/core/phone";
import { ChatCircle, Lock } from "@phosphor-icons/react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { TermsRow, TextsBox } from "@/components/onboarding/consent-boxes";
import { InsetField, InsetMessage } from "@/components/onboarding/inset-field";
import { Actions, StepError } from "./parts";

/*
 * G3, "How may we contact you?" (docs/design.md §4 Get started, D-072, D-074):
 * the email, an optional mobile number, the Terms, and, once a number is
 * typed, the "Text me about my home" box.
 *
 * When texts would be off, the first Continue shows the callout instead of
 * going on, and the button becomes "Continue without texts", which goes on
 * without them. A second press within half a second is ignored, so a quick
 * double-click can't skip it.
 */

const CALLOUT_GUARD_MS = 500;

export type ContactErrors = Partial<
  Record<"email" | "phone" | "terms", string>
>;

/** Whether anything has been typed as a number: then the texts box shows. */
export function hasNumber(phone: string) {
  return /\d/.test(phone);
}

/** The step's own check, on the device, before Continue goes to the server. */
function checkContact(input: {
  editableEmail: boolean;
  email: string;
  phone: string;
  terms: boolean;
}): ContactErrors {
  const errors: ContactErrors = {};
  if (input.editableEmail && !toEmail(input.email)) {
    errors.email = "Enter your email address.";
  }
  if (hasNumber(input.phone) && !toE164(input.phone)) {
    errors.phone = "Enter a 10-digit mobile number.";
  }
  if (!input.terms) errors.terms = "Agree to the Terms to continue.";
  return errors;
}

export function ContactStep({
  emailLocked,
  emailedLink,
  email,
  onEmail,
  phone,
  onPhone,
  terms,
  onTerms,
  texts,
  onTexts,
  errors,
  onErrors,
  member,
  stepError,
  busy,
  busyLabel,
  onBack,
  onContinue,
}: {
  /** On a link the email is the invite's, and read-only (G7 state 10). */
  emailLocked: boolean;
  /** The link was emailed, so the helper says where it went. */
  emailedLink: boolean;
  email: string;
  onEmail: (value: string) => void;
  phone: string;
  onPhone: (value: string) => void;
  terms: boolean;
  onTerms: (value: boolean) => void;
  texts: boolean;
  onTexts: (value: boolean) => void;
  errors: ContactErrors;
  onErrors: (errors: ContactErrors) => void;
  /** The email or number already belongs to a member (G7 states 1 and 2). */
  member?: "email" | "phone";
  stepError?: string;
  busy: boolean;
  busyLabel: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  // When the callout was shown, for the double-press guard.
  const [calloutAt, setCalloutAt] = useState<number | null>(null);
  const numbered = hasNumber(phone);
  const textsOn = numbered && texts;
  const form = useRef<HTMLFormElement>(null);

  // The callout asks for a second press, so it and the buttons are brought
  // into view when it opens. On a phone G3 runs past the fold.
  const calloutShown = calloutAt !== null;
  // Turning texts on hides it again.
  const calloutOpen = calloutShown && !textsOn;
  useEffect(() => {
    if (!calloutShown || !form.current) return;
    const below =
      form.current.getBoundingClientRect().bottom - window.innerHeight + 16;
    if (below <= 0) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollBy({ top: below, behavior: reduced ? "auto" : "smooth" });
  }, [calloutShown]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const next = checkContact({
      editableEmail: !emailLocked,
      email,
      phone,
      terms,
    });
    onErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!textsOn) {
      if (calloutAt === null) {
        setCalloutAt(performance.now());
        return;
      }
      if (performance.now() - calloutAt < CALLOUT_GUARD_MS) return;
    }
    onContinue();
  }

  const emailError =
    member === "email"
      ? "That email already has a Housemate account."
      : errors.email;
  const phoneError =
    member === "phone"
      ? "That number already has a Housemate account."
      : errors.phone;
  const signInInstead = (
    <Link
      href="/sign-in"
      className="self-start rounded-sm underline decoration-1 underline-offset-3"
    >
      Sign in instead
    </Link>
  );

  return (
    <form ref={form} onSubmit={submit} noValidate>
      <div className="flex flex-col gap-4">
        <InsetField
          id="email"
          label="Email"
          tone={emailLocked ? "readOnly" : emailError ? "error" : "resting"}
          trailing={
            emailLocked ? (
              <Lock size={18} aria-hidden className="shrink-0 text-muted" />
            ) : undefined
          }
          message={
            emailError ? (
              <InsetMessage id="email-message" error={emailError}>
                {member === "email" ? signInInstead : null}
              </InsetMessage>
            ) : emailLocked && emailedLink ? (
              <Helper id="email-message">
                This is where your link was sent, so it can&rsquo;t be changed
                here.
              </Helper>
            ) : undefined
          }
          control={(valueClass) => (
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              readOnly={emailLocked || busy}
              onChange={(event) => {
                onEmail(event.target.value);
                if (errors.email) onErrors({ ...errors, email: undefined });
              }}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={
                emailError || (emailLocked && emailedLink)
                  ? "email-message"
                  : undefined
              }
              className={`${valueClass} truncate`}
            />
          )}
        />

        <InsetField
          id="phone"
          label="Mobile number (optional)"
          tone={phoneError ? "error" : "resting"}
          message={
            phoneError ? (
              <InsetMessage id="phone-message" error={phoneError}>
                {member === "phone" ? signInInstead : null}
              </InsetMessage>
            ) : (
              <Helper id="phone-message">
                We&rsquo;ll text a code to confirm it. You&rsquo;ll use it to
                sign in.
              </Helper>
            )
          }
          control={(valueClass) => (
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phone}
              readOnly={busy}
              onChange={(event) => {
                onPhone(event.target.value);
                setCalloutAt(null);
                if (errors.phone) onErrors({ ...errors, phone: undefined });
              }}
              aria-invalid={phoneError ? true : undefined}
              aria-describedby="phone-message"
              className={valueClass}
            />
          )}
        />

        <TermsRow
          box={{
            id: "terms",
            name: "terms",
            checked: terms,
            disabled: busy,
            onChange: (event) => {
              onTerms(event.target.checked);
              if (errors.terms) onErrors({ ...errors, terms: undefined });
            },
          }}
          error={errors.terms}
        />

        {numbered ? (
          <TextsBox
            box={{
              id: "texts",
              name: "texts",
              checked: texts,
              disabled: busy,
              onChange: (event) => {
                onTexts(event.target.checked);
                setCalloutAt(null);
              },
            }}
          />
        ) : null}

        {calloutOpen ? <Callout numbered={numbered} /> : null}
      </div>

      <StepError message={stepError} />
      <Actions
        label={
          busy ? busyLabel : calloutOpen ? "Continue without texts" : "Continue"
        }
        onBack={onBack}
        busy={busy}
      />
    </form>
  );
}

/** A field's helper: 8px below it, inset 4px, at 14/20 muted. */
function Helper({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="px-1 text-sm font-normal text-muted">
      {children}
    </p>
  );
}

/**
 * "Housemate works best by text." Its wording depends on whether there's a
 * number: without one, it asks for one; with one, it asks for the box.
 */
function Callout({ numbered }: { numbered: boolean }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-5"
    >
      <span className="flex h-[22px] shrink-0 items-center">
        <ChatCircle size={22} aria-hidden className="text-evergreen" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-base leading-[22px] font-bold text-heading">
          Housemate works best by text.
        </p>
        <p className="text-sm font-normal text-pretty text-muted">
          {numbered
            ? "Your number will only get sign-in codes. Tick “Text me about my home” to text Housemate what your home needs and get updates and reminders back."
            : "Housemate is text-based: you text what your home needs, and it texts back with questions, updates and reminders. We highly recommend adding your number and turning on texts."}
        </p>
      </div>
    </div>
  );
}
