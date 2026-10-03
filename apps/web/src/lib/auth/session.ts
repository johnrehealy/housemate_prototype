import "server-only";
import { getMemberByUserId, type MemberSummary } from "@housemate/core/db";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { serverDb } from "@/lib/server-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Who is signed in. This is the real access check: the proxy only does a cheap
 * cookie check, and a layout can't stop nested segments from rendering, so
 * every page and server action that touches home data calls this.
 *
 * `cache` makes it run once per render, however many components ask.
 */
export const currentMember = cache(
  async (): Promise<MemberSummary | undefined> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return undefined;
    const member = await getMemberByUserId(serverDb(), user.id);
    // A session alone isn't enough: only an active member can use the app.
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

/**
 * The signed-in staff member. Anyone else gets a 404, so the ops pages don't
 * say they exist.
 */
export async function requireStaff(): Promise<MemberSummary> {
  const member = await currentMember();
  if (!member || member.role !== "staff") notFound();
  return member;
}

/** Where someone goes once they're signed in: staff to ops, members to chat. */
export function homePath(member: Pick<MemberSummary, "role">): string {
  return member.role === "staff" ? "/ops" : "/chat";
}
