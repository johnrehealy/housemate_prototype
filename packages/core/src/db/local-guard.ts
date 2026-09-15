const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * Stops test and seed code from touching a real database. Members are real
 * people, so generated data may only ever go into local Supabase.
 */
export function assertLocalDatabase(databaseUrl: string): void {
  if (!isLocalDatabaseUrl(databaseUrl)) {
    throw new Error(
      "Refusing to run against a non-local database. Test and seed data only go into local Supabase.",
    );
  }
}
