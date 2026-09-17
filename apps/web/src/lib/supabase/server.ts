import "server-only";
import { createServerClient } from "@supabase/ssr";
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
