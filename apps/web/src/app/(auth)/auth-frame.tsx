import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { StoryPanel } from "./sign-in/story-panel";

/*
 * The frame the sign-in page and the welcome step share, at three widths
 * (docs/design.md §4 Sign-in page, D-036 and D-056). Below --breakpoint-lg the
 * story panel is gone, so the lockup moves into the column, along with any
 * note the page passes — the panel is where they live at the other two widths.
 */
export function AuthFrame({
  children,
  note,
}: {
  children: ReactNode;
  /** A line pinned to the bottom of the column below --breakpoint-lg. */
  note?: ReactNode;
}) {
  return (
    <>
      <StoryPanel />
      <div className="flex flex-1 flex-col justify-between px-6 pt-[22px] pb-8 lg:items-center lg:justify-center lg:px-10 lg:py-0 xl:px-16">
        <div className="flex w-full flex-col items-start gap-14 lg:w-auto lg:gap-0">
          <Wordmark className="h-5 w-auto text-evergreen lg:hidden" />
          {children}
        </div>
        {note}
      </div>
    </>
  );
}
