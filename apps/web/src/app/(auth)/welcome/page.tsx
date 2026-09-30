import { formatUsPhone } from "@housemate/core/phone";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessionMember } from "@/lib/auth/session";
import { AuthFrame } from "../auth-frame";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Welcome" };

/**
 * The one-time welcome step after an invited member's first sign-in (D-067).
 * It asks once whether they want texts, and Continue activates them, so an
 * active member never sees it again.
 */
export default async function WelcomePage() {
  const member = await sessionMember();
  if (!member) redirect("/sign-in");
  if (member.status === "active") redirect("/chat");
  // Staff are activated at sign-in, and a removed member can't sign in.
  if (member.status !== "invited" || member.role !== "member") {
    redirect("/sign-in");
  }

  return (
    <AuthFrame>
      <div className="flex w-full max-w-[360px] flex-col gap-8 lg:w-[360px]">
        <div className="flex flex-col gap-1">
          <h1 className="text-display text-heading">Welcome to Housemate</h1>
          <p className="text-label text-muted">
            You&rsquo;re signed in with {formatUsPhone(member.phone)}.
          </p>
        </div>
        <WelcomeForm />
      </div>
    </AuthFrame>
  );
}
