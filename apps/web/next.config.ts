import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@housemate/core"],
  // Next logs each server action's arguments in development, and Get started's
  // are a name, a home address, a number and an email (invariant 6).
  logging: { serverFunctions: false },
};

export default nextConfig;
