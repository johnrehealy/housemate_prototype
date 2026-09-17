"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  // Local scope: signing out of this browser shouldn't end the member's
  // sessions anywhere else. Supabase's default revokes every one of their
  // refresh tokens, which would sign them out on their phone too. Ending all
  // sessions belongs behind its own control, not this button.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}
