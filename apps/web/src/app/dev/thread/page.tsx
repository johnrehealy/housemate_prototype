import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { serverEnv } from "@/lib/server-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { THREAD_COLUMNS, THREAD_LIMIT, type ThreadMessage } from "./messages";
import { LiveThread } from "./live-thread";

export const metadata: Metadata = { title: "Live thread" };

/*
 * A minimal realtime view of the home's texts: dev tooling that proves the
 * path the Chat view will use in Slice 1 (D-058). Deliberately plain, and it
 * doesn't exist in production.
 *
 * Everything is read as the member, through their own session, so row-level
 * security applies to the first render and to the live updates alike.
 */
export default async function LiveThreadPage() {
  if (serverEnv().APP_ENV === "production") notFound();
  const member = await requireMember();
  if (!member.homeId) notFound();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select(THREAD_COLUMNS)
    .eq("home_id", member.homeId)
    .order("created_at", { ascending: false })
    .limit(THREAD_LIMIT);
  if (error) throw new Error(`Couldn't read the thread (${error.code}).`);

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-display text-heading">Live thread</h1>
        <p className="text-label text-muted">
          Your home&apos;s texts, updated as they arrive. Read through your own
          session, so you see what row-level security lets you see.
        </p>
      </div>
      <LiveThread
        homeId={member.homeId}
        initial={(data as ThreadMessage[]).reverse()}
      />
    </main>
  );
}
