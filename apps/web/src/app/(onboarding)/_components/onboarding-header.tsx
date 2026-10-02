import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";

/**
 * Get started's header (docs/design.md §4 Get started, Frame): 88px with the
 * lockup 48px in, or 64px with 20px gutters below --breakpoint-md. Meet adds
 * its count at the right.
 */
export function OnboardingHeader({ end }: { end?: ReactNode }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-5 md:h-[88px] md:px-12">
      <Wordmark className="h-5 w-auto text-evergreen" />
      {end}
    </header>
  );
}

/** The serif question (onboarding question: 52/60, 34/40 narrow). */
export const QUESTION =
  "font-serif text-[34px] leading-10 tracking-tight text-balance text-evergreen md:text-[52px] md:leading-[60px]";

/** The helper under it (onboarding helper: 17/26, 16/24 narrow). */
export const HELPER =
  "text-base font-normal text-balance text-muted md:text-lead";
