import { defineConfig } from "vitest/config";

// Database tests run against local Supabase (`pnpm db:start`). Files run one
// at a time; each test works inside a transaction that is rolled back.
export default defineConfig({
  test: {
    include: ["src/**/*.db.test.ts"],
    fileParallelism: false,
  },
});
