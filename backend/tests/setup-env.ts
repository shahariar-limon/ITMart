import "dotenv/config";

// Tests truncate application tables. Never fall back to the development or
// production DATABASE_URL: an explicitly isolated database/Neon branch is required.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL must point to an isolated test database; refusing to reset DATABASE_URL");
if (process.env.DATABASE_URL && testUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must be different from DATABASE_URL; refusing to truncate the application database");
}
process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test";
