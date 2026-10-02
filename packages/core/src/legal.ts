/**
 * The version of the Terms someone agrees to on Get started (D-072). It's the
 * Terms page's effective date, which the page reads from here, so the two can't
 * disagree. Changing the Terms means changing this, and a Get started page
 * rendered before the change is refused rather than recorded against Terms it
 * didn't link to.
 *
 * Kept free of imports, so pages can read it without pulling in the rest of
 * the package.
 */
export const TERMS_VERSION = "2026-10-02";

/** An ISO date as the legal pages write it, e.g. "September 30, 2026". */
export function formatLegalDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
