import { defineConfig } from "vitest/config";

// Isolated unit tests mock external dependencies and never connect to a database.
export default defineConfig({
  test: { include: ["tests/**/*.unit.test.ts"] },
});
