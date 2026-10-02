import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";

/**
 * Sign-in's frame (docs/design.md §4 Sign-in page, boards S1 and S2, D-073):
 * one 360px column, centred both ways, with the lockup as its first item.
 * Below --breakpoint-md the column fills the width and starts at the top
 * instead.
 */
export function CenteredFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex w-full justify-center px-6 pt-[22px] pb-10 md:items-center md:py-16">
      <div className="flex w-full flex-col md:w-[360px]">
        <Wordmark className="h-5 w-auto self-start text-evergreen" />
        <div className="mt-14 flex flex-col">{children}</div>
      </div>
    </main>
  );
}

/** The page's heading, with an optional helper line 4px under it. */
export function FrameHeading({
  title,
  helper,
  helperId,
}: {
  title: string;
  helper?: string;
  helperId?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-display text-heading">{title}</h1>
      {helper ? (
        <p id={helperId} className="text-label text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
