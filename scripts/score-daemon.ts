/**
 * Standalone Score Daemon
 *
 * Runs independently of the Next.js server and is intended to be managed by
 * PM2.  When started it:
 *   - Updates all manga scores every hour
 *   - Runs the cull pass once per day at 02:00 (local time)
 *
 * Any errors are recorded in the Job table so they are visible in the admin UI.
 *
 * Usage (tsx loads .env.local automatically via --env-file):
 *   npm run score:daemon
 *
 * PM2:
 *   pm2 start npm --name score-daemon -- run score:daemon
 */

import { PrismaClient } from "@prisma/client";
import { updateAllScores, cullLowScoreMangas } from "../src/lib/scorer";

// ---------------------------------------------------------------------------
// Prisma (singleton for this process)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ log: ["error"] }) as InstanceType<typeof PrismaClient>;

// ---------------------------------------------------------------------------
// Job logging helpers
// ---------------------------------------------------------------------------

async function logJobStart(type: string): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      status: "running",
      startedAt: new Date(),
    },
  });
  return job.id;
}

async function logJobDone(
  id: string,
  result?: Record<string, unknown>,
): Promise<void> {
  await prisma.job.update({
    where: { id },
    data: {
      status: "done",
      completedAt: new Date(),
      result: result ? JSON.stringify(result) : null,
    },
  });
}

async function logJobFailed(id: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.job.update({
    where: { id },
    data: {
      status: "failed",
      completedAt: new Date(),
      error: message,
    },
  });
}

// ---------------------------------------------------------------------------
// Task runners
// ---------------------------------------------------------------------------

async function runScoreUpdate(): Promise<void> {
  const jobId = await logJobStart("score_calc");
  try {
    await updateAllScores();
    await logJobDone(jobId, { ts: new Date().toISOString() });
    console.log(`[score-daemon] Score update done at ${new Date().toISOString()}`);
  } catch (err) {
    await logJobFailed(jobId, err);
    console.error("[score-daemon] Score update failed:", err);
  }
}

async function runCull(): Promise<void> {
  const jobId = await logJobStart("score_cull");
  try {
    const culled = await cullLowScoreMangas();
    await logJobDone(jobId, { culled, ts: new Date().toISOString() });
    console.log(
      `[score-daemon] Cull pass done at ${new Date().toISOString()} — ${culled} manga(s) culled`,
    );
  } catch (err) {
    await logJobFailed(jobId, err);
    console.error("[score-daemon] Cull pass failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Simple scheduler
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;

function msUntilNextHHMM(hour: number, minute = 0): number {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0,
  );
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleDailyCull() {
  const delay = msUntilNextHHMM(2, 0); // 02:00
  console.log(
    `[score-daemon] Next cull scheduled in ${Math.round(delay / 60000)} minutes`,
  );
  setTimeout(async () => {
    await runCull();
    scheduleDailyCull(); // reschedule
  }, delay);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("[score-daemon] Starting…");

  // Run score update immediately, then every hour
  await runScoreUpdate();
  setInterval(runScoreUpdate, HOUR_MS);

  // Schedule daily cull
  scheduleDailyCull();

  console.log("[score-daemon] Running. Press Ctrl+C to stop.");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[score-daemon] Shutting down…");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[score-daemon] SIGTERM received. Shutting down…");
  await prisma.$disconnect();
  process.exit(0);
});

main().catch((err) => {
  console.error("[score-daemon] Fatal error:", err);
  process.exit(1);
});
