import "server-only";
import { getMemberByUserId, type MemberSummary } from "@housemate/core/db";
import { redirect } from "next/navigation";
import { cache } from "react";
import { serverDb } from "@/lib/server-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Whoever holds the session, whatever their status. Only the welcome step
 * uses it, because it's the one page for members who aren't active yet.
 * Everything else goes through `currentMember`.
 */
export const sessionMember = cache(
  async (): Promise<MemberSummary | undefined> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return undefined;
    return getMemberByUserId(serverDb(), user.id);
  },
);

/**
 * Who is signed in. This is the real access check: the proxy only does a cheap
 * cookie check, and a layout can't stop nested segments from rendering, so
 * every page and server action that touches home data calls this.
 *
 * `cache` makes it run once per render, however many components ask.
 */
export const currentMember = cache(
  async (): Promise<MemberSummary | undefined> => {
    const member = await sessionMember();
    // A session alone isn't enough: only an active member has a home to see.
    if (!member || member.status !== "active") return undefined;
    return member;
  },
);

/** The signed-in member, or a redirect to sign-in. */
export async function requireMember(): Promise<MemberSummary> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  return member;
}
