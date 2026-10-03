/*
 * The form controls (docs/design.md §4 Form controls, D-036), used by the
 * sign-in form. They're class strings rather than components because §7 Q13
 * leaves open whether they get their own named tokens, and moving them twice
 * is worse than late.
 */

export const FIELD =
  "h-10 w-full rounded-md border px-3 text-base focus:outline-hidden";

/** Resting, hover and focus in one string; error and busy replace it. */
export const FIELD_RESTING =
  "border-muted bg-surface text-heading placeholder:text-muted hover:border-body focus:border-evergreen focus:shadow-[inset_0_0_0_1px_var(--color-evergreen)]";
/** Focused, it keeps the error line and gains the buttons' ring outside it. */
export const FIELD_ERROR =
  "border-status-blocked-fg bg-surface text-heading placeholder:text-muted shadow-[inset_0_0_0_1px_var(--color-status-blocked-fg)] focus:shadow-[inset_0_0_0_1px_var(--color-status-blocked-fg),0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-evergreen)]";
export const FIELD_BUSY =
  "border-line bg-nav text-muted placeholder:text-muted";

export const PRIMARY_BUTTON =
  "flex h-10 w-full items-center justify-center gap-2 rounded-md bg-evergreen text-label text-on-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-evergreen)] disabled:opacity-60";

/*
 * The 6px focus padding from the comp is always applied and pulled back out
 * with a matching negative margin, so the ring lands exactly where the comp
 * draws it without the label jumping sideways when focus arrives.
 */
export const TEXT_BUTTON =
  "-ml-1.5 flex h-9 items-center gap-2 self-start rounded-md px-1.5 text-label text-muted underline-offset-[3px] transition-colors duration-120 ease-out hover:text-body hover:underline hover:decoration-1 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen)] disabled:opacity-60";

export const MESSAGE = "flex gap-2 pt-0.5 text-xs";
