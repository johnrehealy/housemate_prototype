import { ArrowLeft, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { BACK_BUTTON, LARGE_BUTTON } from "@/components/onboarding/controls";
import { InsetField, InsetMessage } from "@/components/onboarding/inset-field";

/*
 * The pieces every Get started step shares (docs/design.md §4 Get started,
 * Form controls).
 */

export const STEPS = 4;

export const SOMETHING_WRONG = "Something went wrong. Try again.";

/** Four 3px segments; finished and current ones fill in evergreen. */
export function Progress({ step }: { step: number }) {
  return (
    <div
      role="progressbar"
      aria-label={`Step ${step} of ${STEPS}`}
      aria-valuemin={1}
      aria-valuemax={STEPS}
      aria-valuenow={step}
      className="flex w-40 gap-1"
    >
      {Array.from({ length: STEPS }, (_, index) => (
        <span
          key={index}
          className="h-[3px] flex-1 overflow-clip rounded-full bg-line-strong"
        >
          <span
            className={`block h-full origin-left rounded-full bg-evergreen transition-transform duration-200 ease-out motion-reduce:transition-none ${
              index < step ? "scale-x-100" : "scale-x-0"
            }`}
          />
        </span>
      ))}
    </div>
  );
}

/** A text field on a step: first and last name. */
export function TextField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  return (
    <InsetField
      id={id}
      label={label}
      tone={error ? "error" : "resting"}
      className="flex-1"
      message={<InsetMessage id={`${id}-message`} error={error} />}
      control={(valueClass) => (
        <input
          id={id}
          name={id}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-message` : undefined}
          className={valueClass}
        />
      )}
    />
  );
}

/** A step-wide failure, under the answer: "Something went wrong", say. */
export function StepError({ message }: { message?: ReactNode }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-6 flex items-start justify-center gap-2 text-xs text-status-blocked-fg"
    >
      <WarningCircle size={18} aria-hidden className="mt-px shrink-0" />
      {message}
    </p>
  );
}

/** The large primary button, with its working state. */
export function LargeButton({
  label,
  busy = false,
  type = "submit",
  onClick,
}: {
  label: string;
  busy?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      className={LARGE_BUTTON}
    >
      {busy ? (
        <CircleNotch
          size={18}
          aria-hidden
          className="shrink-0 animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {label}
    </button>
  );
}

/**
 * The Actions row: Back at the left, the large button on the column's centre,
 * and an empty slot as wide as Back at the right (`1fr auto 1fr`). A step with
 * nothing to go back to shows the button alone.
 */
export function Actions({
  label,
  onBack,
  busy = false,
}: {
  label: string;
  onBack?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className={BACK_BUTTON}
        >
          <ArrowLeft size={18} aria-hidden className="shrink-0" />
          Back
        </button>
      ) : (
        <span />
      )}
      <LargeButton label={label} busy={busy} />
      <span />
    </div>
  );
}
