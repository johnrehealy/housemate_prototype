import { createClient, type User } from "@supabase/supabase-js";
import { AuthAdminError, type AuthAdmin } from "../actions/context";

/**
 * Creates and changes the Supabase Auth accounts members sign in with.
 * Uses the project's secret key, so it only ever runs on the server.
 */
export function createSupabaseAuthAdmin(config: {
  url: string;
  secretKey: string;
}): AuthAdmin {
  const client = createClient(config.url, config.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const failure = (what: string, error: Error) =>
    new Error(`Could not ${what}: ${error.message}`, { cause: error });

  /** Every account, a page at a time. The pilot has a few dozen at most. */
  async function* allUsers(): AsyncGenerator<User> {
    for (let page = 1; ; page++) {
      const { data, error } = await client.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw failure("look up sign-in accounts", error);
      yield* data.users;
      if (data.users.length < 1000) return;
    }
  }

  function created(data: { user: User | null }) {
    const userId = data.user?.id;
    if (!userId) throw new Error("Supabase Auth returned no account");
    return { userId };
  }

  return {
    async createUser({ phone }) {
      const { data, error } = await client.auth.admin.createUser({
        phone,
        // Staff are added by the team for a number it confirmed.
        phone_confirm: true,
      });
      if (error) throw failure("create the sign-in account", error);
      return created(data);
    },

    async findUserIds({ email, phone }) {
      // Supabase keeps numbers without their "+", and emails lowercased.
      const storedPhone = phone?.replace(/^\+/, "");
      const ids: string[] = [];
      for await (const user of allUsers()) {
        if (
          (email && user.email?.toLowerCase() === email) ||
          (storedPhone && user.phone === storedPhone)
        ) {
          ids.push(user.id);
        }
      }
      return ids;
    },

    async createSignupUser(input) {
      const { data, error } = await client.auth.admin.createUser(
        "phone" in input
          ? { phone: input.phone, phone_confirm: true }
          : { email: input.email, email_confirm: true },
      );
      if (error) throw failure("create the sign-in account", error);
      return created(data);
    },

    async setEmail(userId, email) {
      const { error } = await client.auth.admin.updateUserById(userId, {
        email,
        // Proven by the emailed link or code before this is called.
        email_confirm: true,
      });
      if (!error) return;
      if (error.code === "email_exists") {
        throw new AuthAdminError("email_taken", "That email has an account.");
      }
      throw failure("set the sign-in email", error);
    },

    async deleteUser(userId) {
      const { error } = await client.auth.admin.deleteUser(userId);
      if (error) throw failure("remove the sign-in account", error);
    },
  };
}
