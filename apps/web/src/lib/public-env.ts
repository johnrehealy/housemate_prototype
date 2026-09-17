/**
 * Supabase details that are safe in the browser. Read as complete literals, so
 * Next can inline them into the client bundle.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function publicSupabaseConfig() {
  if (!url || !publishableKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local. Run `pnpm exec supabase status -o env` for the local values.",
    );
  }
  return { url, publishableKey };
}
