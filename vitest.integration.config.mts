import path from "node:path"
import { defineConfig } from "vitest/config"

// Integration tests hit the real dev Supabase project (credentials from .env.local via
// `pnpm test:db`). Kept separate from `pnpm test` so unit tests stay offline and fast.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
