import { WarningCircle } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import {
  INSET_BOX,
  INSET_LABEL,
  INSET_TONE,
  INSET_VALUE,
  type InsetTone,
} from "./controls";

/**
 * Get started's field (docs/design.md §4 Inset field): the label sits inside
 * the 64px box, over the value. The whole label area focuses the control.
 *
 * `control` receives the classes for its value, so this works for inputs and
 * the State select alike. `leading` and `trailing` sit beside the label area:
 * the address search's glyph and clear button, the read-only email's lock.
 */
export function InsetField({
  id,
  label,
  tone = "resting",
  control,
  leading,
  trailing,
  message,
  className = "",
}: {
  id: string;
  label: string;
  tone?: InsetTone;
  control: (valueClass: string) => ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** The line 8px under the box. */
  message?: ReactNode;
  className?: string;
}) {
  const labelTone = tone === "error" ? "text-status-blocked-fg" : "text-muted";
  const valueTone = tone === "readOnly" ? "text-muted" : "text-heading";

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <div className={`${INSET_BOX} ${INSET_TONE[tone]}`}>
        {leading}
        <label
          htmlFor={id}
          className="relative flex min-w-0 flex-1 cursor-text flex-col gap-0.5"
        >
          <span className={`${INSET_LABEL} ${labelTone}`}>{label}</span>
          {control(`${INSET_VALUE} ${valueTone}`)}
        </label>
        {trailing}
      </div>
      {message}
    </div>
  );
}

/**
 * The message line under an inset field: an 18px glyph and 13/19 text, 8px
 * apart, for an error; the text alone in muted for a hint.
 */
export function InsetMessage({
  id,
  error,
  hint,
  children,
}: {
  id: string;
  error?: ReactNode;
  hint?: ReactNode;
  /** Anything under the message, such as "Sign in instead". */
  children?: ReactNode;
}) {
  if (error) {
    return (
      <div
        id={id}
        role="alert"
        className="flex gap-2 text-xs text-status-blocked-fg"
      >
        <WarningCircle size={18} aria-hidden className="mt-px shrink-0" />
        <div className="flex flex-col gap-0.5">
          <p>{error}</p>
          {children}
        </div>
      </div>
    );
  }
  if (!hint) return null;
  return (
    <p id={id} role="status" className="text-xs text-muted">
      {hint}
    </p>
  );
}
