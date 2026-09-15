import { createClient } from "@supabase/supabase-js";
import type { AuthAdmin } from "../actions/context";

/**
 * Creates and removes the Supabase Auth accounts members sign in with.
 * Uses the project's secret key, so it only ever runs on the server.
 */
export function createSupabaseAuthAdmin(config: {
  url: string;
  secretKey: string;
}): AuthAdmin {
  const client = createClient(config.url, config.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return {
    async createUser({ phone }) {
      const { data, error } = await client.auth.admin.createUser({
        phone,
        // Invites are sent to a number the team confirmed, and members prove
        // the number again by signing in with a code.
        phone_confirm: true,
      });
      if (error) {
        throw new Error(
          `Could not create the sign-in account: ${error.message}`,
          {
            cause: error,
          },
        );
      }
      const userId = data.user?.id;
      if (!userId) throw new Error("Supabase Auth returned no account");
      return { userId };
    },

    async deleteUser(userId) {
      const { error } = await client.auth.admin.deleteUser(userId);
      if (error) {
        throw new Error(
          `Could not remove the sign-in account: ${error.message}`,
          {
            cause: error,
          },
        );
      }
    },
  };
}
