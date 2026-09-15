import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// Shared config for packages/* and apps/worker. apps/web has its own Next.js config.
export default defineConfig([
  globalIgnores(["apps/web/**", "**/dist/**", "**/coverage/**"]),
  ...tseslint.configs.recommended,
]);
