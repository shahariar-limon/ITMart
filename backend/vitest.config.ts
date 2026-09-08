import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 90_000,
    hookTimeout: 120_000,
    setupFiles: ["./tests/setup-env.ts"],
  },
});