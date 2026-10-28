import { app } from "./app.js";
import { closePool } from "./app.js";

const portValue = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const server = app.listen(portValue, "127.0.0.1", () => {
  console.info(`KaamAI API listening on port ${portValue}`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.info("HTTP server closed.");
  });
  await closePool();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
