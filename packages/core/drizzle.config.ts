import { defineConfig } from "drizzle-kit";

// Drizzle defines table shapes; security (policies, grants, triggers) lives in
// hand-written SQL migrations alongside the generated ones.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "../../supabase/migrations",
  migrations: { prefix: "supabase" },
  entities: { roles: { provider: "supabase" } },
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
});
