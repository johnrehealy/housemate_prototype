import { WarningCircle } from "@phosphor-icons/react/ssr";
import { MESSAGE } from "./form-controls";

/**
 * The line under a 40px field (docs/design.md §4 Form controls): an error with
 * its glyph, or a hint in muted. Live from the first render, so swapping a
 * hint for an error is announced.
 */
export function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string;
  hint?: string;
}) {
  if (error) {
    return (
      <p id={id} role="alert" className={`${MESSAGE} text-status-blocked-fg`}>
        <WarningCircle size={20} aria-hidden className="shrink-0" />
        {error}
      </p>
    );
  }
  if (!hint) return null;
  return (
    <p id={id} role="status" className={`${MESSAGE} text-muted`}>
      {hint}
    </p>
  );
}
