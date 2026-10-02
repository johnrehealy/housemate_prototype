import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentMember, homePath } from "@/lib/auth/session";
import { CenteredFrame } from "../centered-frame";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  // Only move them on if they can actually use the app. Having a session isn't
  // enough, and the proxy deliberately leaves this decision here (see proxy.ts).
  const member = await currentMember();
  if (member) redirect(homePath(member));

  return (
    <CenteredFrame>
      <SignInForm />
    </CenteredFrame>
  );
}
