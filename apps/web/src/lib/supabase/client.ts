"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "@/lib/public-env";

/**
 * A Supabase client for the browser, signed in as the member through the
 * session cookie. It can only read, and row-level security decides what: every
 * write goes through a server action (invariant 1).
 *
 * `createBrowserClient` returns the same client on every call in a tab.
 */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = publicSupabaseConfig();
  return createBrowserClient(url, publishableKey);
}
