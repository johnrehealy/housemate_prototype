import { configDefaults, defineConfig } from "vitest/config";

// Unit tests only. Database tests need local Supabase: see vitest.db.config.ts.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "src/**/*.db.test.ts"],
  },
});
