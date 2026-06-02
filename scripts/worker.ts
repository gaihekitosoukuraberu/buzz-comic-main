/**
 * Worker entry point – PM2 / ts-node.
 *
 * Starts the background job worker and a lightweight health-check HTTP server
 * on port 3001 (configurable via WORKER_PORT env var).
 *
 * Usage:
 *   npx ts-node --esm scripts/worker.ts
 *   pm2 start ecosystem.config.js --only buzz-comic-worker
 */

import * as http from "http";
import * as path from "path";
import * as url from "url";

// ---------------------------------------------------------------------------
// Path alias setup (mirrors tsconfig @/* → src/*)
// ---------------------------------------------------------------------------

// When running with ts-node we register tsconfig-paths so `@/` imports work.
// In a compiled environment the alias would be resolved at build time.
try {
  const tsConfigPaths = await import("tsconfig-paths");
  const tsConfig = await import("../tsconfig.json", { assert: { type: "json" } });

  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const baseUrl = path.resolve(__dirname, "..");

  tsConfigPaths.register({
    baseUrl,
    paths: (tsConfig.default as { compilerOptions?: { paths?: Record<string, string[]> } }).compilerOptions?.paths ?? { "@/*": ["src/*"] },
  });
} catch {
  // tsconfig-paths may not be installed; proceed without alias resolution
}

// ---------------------------------------------------------------------------
// Import worker after alias registration
// ---------------------------------------------------------------------------

const { startWorker, stopWorker } = await import("../src/lib/queue/worker.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEALTH_PORT = parseInt(process.env.WORKER_PORT ?? "3001", 10);

// ---------------------------------------------------------------------------
// Health-check HTTP server
// ---------------------------------------------------------------------------

const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    })
  );
});

healthServer.listen(HEALTH_PORT, () => {
  console.log(`[worker] Health-check server listening on port ${HEALTH_PORT}`);
});

// ---------------------------------------------------------------------------
// Start worker
// ---------------------------------------------------------------------------

console.log("[worker] Starting job worker…");
startWorker();
console.log("[worker] Worker running. Press Ctrl-C to stop.");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n[worker] Received ${signal}. Shutting down gracefully…`);

  // Stop accepting new health-check requests
  healthServer.close();

  // Stop the poll loop and requeue any in-flight jobs
  await stopWorker();

  console.log("[worker] Shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGHUP", () => void shutdown("SIGHUP"));

process.on("uncaughtException", (err) => {
  console.error("[worker] Uncaught exception:", err);
  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("[worker] Unhandled rejection:", reason);
  // Do not exit – let the worker continue
});
