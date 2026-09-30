import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import Link from "next/link";
import type { ReactNode } from "react";

const LINK =
  "rounded-sm text-evergreen underline decoration-1 underline-offset-[3px] transition-[text-decoration-thickness] duration-120 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen";

/** The disclosure's id, for the box's `aria-describedby`. */
export const TEXT_CONSENT_DISCLOSURE = "text-consent-disclosure";

/**
 * The optional text-consent box with its label, the exact wording it agrees
 * to, and the links to read first (docs/design.md §4 Checkbox, D-067).
 *
 * The welcome step passes a real checkbox and its id, so the label ticks it.
 * The /texts page passes a picture of an unticked one, and gets the same
 * words: both read them from `SMS_OPT_IN`, so what's shown publicly is what
 * members agree to.
 */
export function TextConsent({
  box,
  inputId,
  message,
}: {
  /** The 20px control, or a picture of it. */
  box: ReactNode;
  /** The checkbox's id. Leave it out when `box` is only a picture. */
  inputId?: string;
  /** A message line under the links. */
  message?: ReactNode;
}) {
  const labelClass = "text-label text-heading";

  return (
    // A real box gets 4px above and below for its focus ring, which reaches
    // 4px past it (board A12); the picture on /texts sits flush (L4).
    <div className={`flex items-start gap-3 ${inputId ? "py-1" : ""}`}>
      <div className="relative flex h-5 shrink-0 items-center">{box}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {inputId ? (
          <label htmlFor={inputId} className={`${labelClass} cursor-pointer`}>
            {SMS_OPT_IN.label}
          </label>
        ) : (
          <p className={labelClass}>{SMS_OPT_IN.label}</p>
        )}
        <p
          id={inputId ? TEXT_CONSENT_DISCLOSURE : undefined}
          className="text-xs text-body"
        >
          {SMS_OPT_IN.text}
        </p>
        <p className="flex gap-4 text-xs">
          <Link href="/privacy" className={LINK}>
            Privacy Policy
          </Link>
          <Link href="/terms" className={LINK}>
            Terms
          </Link>
        </p>
        {message}
      </div>
    </div>
  );
}
