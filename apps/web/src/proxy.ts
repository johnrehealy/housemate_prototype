import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every request. It does two jobs:
 *
 * 1. Refreshes the Supabase session and writes the new tokens onto the
 *    response. Server Components can't set cookies, so without this a session
 *    would never refresh.
 * 2. Redirects signed-out visitors to sign-in.
 *
 * The redirect is an optimistic check only. This runs on prefetches too, so it
 * never touches the database; `requireMember` in `lib/auth/session.ts` is the
 * real check, and it runs next to the data.
 *
 * Proxy code is deliberately self-contained (see apps/web/AGENTS.md and the
 * Next.js proxy guide): it may run outside the app's own runtime, so it builds
 * its own Supabase client instead of sharing the one in lib/supabase.
 */

const SIGN_IN_PATH = "/sign-in";

/*
 * Files under `public/`. The matcher below excludes `_next/static` and
 * `_next/image` but nothing else, so without these a signed-out visitor
 * requesting the landing page's logo or photographs would be redirected to
 * sign-in and the images would silently never arrive.
 */
const PUBLIC_ASSET_PREFIXES = ["/_next", "/brand/", "/site/"];

/** Paths a signed-out visitor may see. */
function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === SIGN_IN_PATH ||
    PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local. Run `pnpm exec supabase status -o env` for the local values.",
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must never be cached, or one
        // member's session could be served to another.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // getUser checks the token with the auth server, rather than trusting
  // whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = SIGN_IN_PATH;
    signIn.search = "";
    return NextResponse.redirect(signIn);
  }

  // Sending a signed-in visitor away from sign-in is deliberately *not* done
  // here. Having a session isn't the same as being an active member, and a
  // blind redirect would bounce an invited or removed member between the two
  // pages forever. The sign-in page checks the member itself and redirects
  // only when they can actually use the app.

  return response;
}

export const config = {
  // Everything except static assets and image optimization. Auth routes run
  // through here too, so a signed-out visitor can never reach app data.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
