/*
 * Get started's controls (docs/design.md §4 Form controls: Inset field, Large
 * primary button, Actions row and Checkbox, D-068). Class strings, like the
 * sign-in page's in (auth)/form-controls.ts, until §7 Q13 settles whether
 * controls get named tokens.
 */

/** The 64px box around an inset field's label and value. */
export const INSET_BOX =
  "flex h-16 w-full min-w-0 items-center gap-3 rounded-md border px-4 transition-[border-color,box-shadow] duration-120 ease-out";

export const INSET_TONE = {
  resting:
    "border-line-field bg-surface focus-within:border-evergreen focus-within:shadow-[inset_0_0_0_1px_var(--color-evergreen)]",
  // No fill: the canvas shows through, so it reads as settled, not disabled.
  readOnly: "border-line",
  // Focused, it keeps the error line and gains the buttons' ring outside it,
  // so the field the error moved focus to is still plainly the focused one.
  error:
    "border-status-blocked-fg bg-surface shadow-[inset_0_0_0_1px_var(--color-status-blocked-fg)] focus-within:shadow-[inset_0_0_0_1px_var(--color-status-blocked-fg),0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-evergreen)]",
} as const;

export type InsetTone = keyof typeof INSET_TONE;

/** 12/16/+0.04em capitals, 2px above the value. */
export const INSET_LABEL = "text-2xs tracking-wide uppercase";

/** 17/24. The value's colour comes from the tone. */
export const INSET_VALUE =
  "w-full min-w-0 bg-transparent text-lead leading-6 placeholder:text-muted focus:outline-hidden";

/** The primary button at Get started and Meet size: 44px, at least 176 wide. */
export const LARGE_BUTTON =
  "flex h-11 min-w-44 items-center justify-center gap-2 rounded-md bg-evergreen px-8 text-label text-on-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-evergreen)] disabled:cursor-default disabled:hover:opacity-100";

/** The Back text button: 36px target, 8px side padding, an 18px arrow. */
export const BACK_BUTTON =
  "flex h-9 items-center gap-2 justify-self-start rounded-md px-2 text-label text-muted transition-colors duration-120 ease-out hover:text-body focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen)]";

/** An evergreen link with a 1px underline 3px below. */
export const INLINE_LINK =
  "rounded-sm text-evergreen underline decoration-1 underline-offset-3 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen";

/**
 * A 20px checkbox, drawn from scratch so it matches the boards. The mark is a
 * sibling that shows on `peer-checked`, so the input must come first in a
 * `relative` slot.
 */
export const CHECKBOX =
  "peer size-5 shrink-0 cursor-pointer appearance-none rounded-sm border border-line-field bg-surface transition-colors duration-120 ease-out hover:border-body checked:border-evergreen checked:bg-evergreen checked:hover:border-evergreen focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-evergreen)]";

/** A required box left unticked (G7 state 9). */
export const CHECKBOX_ERROR =
  "border-status-blocked-fg shadow-[inset_0_0_0_1px_var(--color-status-blocked-fg)] hover:border-status-blocked-fg";
