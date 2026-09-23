import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { currentMember } from "@/lib/auth/session";
import { SignInForm } from "./sign-in-form";
import { StoryPanel } from "./story-panel";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  // Only move them on if they can actually use the app. Having a session isn't
  // enough, and the proxy deliberately leaves this decision here (see proxy.ts).
  if (await currentMember()) redirect("/chat");

  /*
   * Three widths (docs/design.md §4 Sign-in page, D-056). Below
   * --breakpoint-lg the story panel is gone, so the lockup moves into this
   * column. The invite note doesn't: the narrow boards drop it (D-057).
   */
  return (
    <>
      <StoryPanel />
      <div className="flex flex-1 flex-col px-6 pt-[22px] pb-8 lg:items-center lg:justify-center lg:px-10 lg:py-0 xl:px-16">
        <div className="flex w-full flex-col items-start gap-14 lg:w-auto lg:gap-0">
          <Wordmark className="h-5 w-auto text-evergreen lg:hidden" />
          <SignInForm />
        </div>
      </div>
    </>
  );
}
