import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function start(): Promise<void> {
  await connectDatabase();
  const server = createServer(createApp());

  server.listen(env.PORT, () => {
    console.log(`ITMart API listening on port ${env.PORT}`);
  });

  async function shutdown(signal: string): Promise<void> {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((error: unknown) => {
  console.error("API startup failed", error);
  process.exit(1);
});
