import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicSupabaseConfig } from "@/lib/public-env";

/**
 * A Supabase client for one server render or one server action, reading the
 * session from the request's cookies.
 *
 * Never share it between requests: the client writes refreshed tokens back
 * through `setAll`, and a shared client would write them onto the wrong
 * response.
 */
export async function createSupabaseServerClient() {
  const { url, publishableKey } = publicSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components get a read-only cookie store. The proxy runs
          // before every request and writes refreshed sessions there instead.
        }
      },
    },
  });
}

/**
 * A Supabase client for sending and checking one-time codes. It keeps
 * nothing, so it never writes a cookie: a session goes onto the cookie client
 * above only once there's a member to sign in.
 *
 * The cookie client always uses PKCE, which stores a code verifier cookie
 * with every emailed code. Codes here are checked with `verifyOtp`, which
 * doesn't need it, and a cookie set in a server action makes Next render the
 * page again in place, which Get started can't have (see its flow).
 */
export function createSupabaseCodeClient() {
  const { url, publishableKey } = publicSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
