import { describe, expect, it } from "vitest";
import { assertLocalDatabase, isLocalDatabaseUrl } from "./local-guard";

describe("local database guard", () => {
  it.each([
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    "postgresql://postgres:postgres@localhost:54322/postgres",
    "postgresql://postgres:postgres@[::1]:54322/postgres",
  ])("allows %s", (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(true);
    expect(() => assertLocalDatabase(url)).not.toThrow();
  });

  it.each([
    "postgresql://postgres.abcd:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres:secret@db.abcd.supabase.co:5432/postgres",
    "not a url",
  ])("refuses %s", (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(false);
    expect(() => assertLocalDatabase(url)).toThrow(/non-local database/);
  });

  it("doesn't echo the connection string, which may hold a password", () => {
    const url =
      "postgresql://postgres:hunter2@db.abcd.supabase.co:5432/postgres";
    expect(() => assertLocalDatabase(url)).toThrow(
      expect.not.objectContaining({
        message: expect.stringContaining("hunter2"),
      }),
    );
  });
});
