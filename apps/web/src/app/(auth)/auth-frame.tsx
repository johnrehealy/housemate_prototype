import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { StoryPanel } from "./sign-in/story-panel";

/*
 * The frame the sign-in page and the welcome step share, at three widths
 * (docs/design.md §4 Sign-in page, D-036 and D-056). Below --breakpoint-lg the
 * story panel is gone, so the lockup moves into the column. The invite note
 * doesn't: the narrow boards drop it (D-057).
 */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <StoryPanel />
      <div className="flex flex-1 flex-col px-6 pt-[22px] pb-8 lg:items-center lg:justify-center lg:px-10 lg:py-0 xl:px-16">
        <div className="flex w-full flex-col items-start gap-14 lg:w-auto lg:gap-0">
          <Wordmark className="h-5 w-auto text-evergreen lg:hidden" />
          {children}
        </div>
      </div>
    </>
  );
}
