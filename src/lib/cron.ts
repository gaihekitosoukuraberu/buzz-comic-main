/**
 * Cron job manager for Buzz Comic.
 *
 * Schedules:
 *   - Score update:  every hour
 *   - Cull:          daily at 02:00
 *   - Sheets sync:   daily at 06:00
 *
 * This module is intended to run in a Node.js process (e.g. the score daemon
 * or a custom server).  It must NOT be imported in Next.js edge or browser
 * contexts.
 *
 * node-cron is an optional dependency.  If not installed the module falls back
 * to a simple setInterval-based scheduler.
 */

import { updateAllScores, cullLowScoreMangas } from "@/lib/scorer";

// ---------------------------------------------------------------------------
// Minimal cron-like scheduler built on setInterval / setTimeout
// ---------------------------------------------------------------------------

type CronJob = {
  label: string;
  intervalMs?: number;
  cronExpr?: string;
  handler: () => Promise<void>;
  timer?: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;
};

const jobs: CronJob[] = [];

function log(level: "info" | "error", msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (level === "error") {
    console.error(`[cron][${ts}] ERROR ${msg}`, extra ?? "");
  } else {
    console.log(`[cron][${ts}] ${msg}`);
  }
}

async function runSafe(job: CronJob) {
  log("info", `Running job: ${job.label}`);
  try {
    await job.handler();
    log("info", `Job done: ${job.label}`);
  } catch (err) {
    log("error", `Job failed: ${job.label}`, err);
  }
}

// ---------------------------------------------------------------------------
// Milliseconds until the next occurrence of a specific hour/minute (local time)
// ---------------------------------------------------------------------------
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
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

// ---------------------------------------------------------------------------
// Job definitions
// ---------------------------------------------------------------------------

/** Re-schedule a daily job after each execution */
function scheduleDailyJob(job: CronJob & { hour: number; minute?: number }) {
  const delay = msUntilNextHHMM(job.hour, job.minute ?? 0);
  job.timer = setTimeout(async () => {
    await runSafe(job);
    scheduleDailyJob(job); // reschedule for next day
  }, delay);
}

const scoreUpdateJob: CronJob = {
  label: "score-update",
  intervalMs: 60 * 60 * 1000, // 1 hour
  handler: updateAllScores,
};

const cullJob: CronJob & { hour: number; minute: number } = {
  label: "cull",
  hour: 2,
  minute: 0,
  handler: async () => {
    const count = await cullLowScoreMangas();
    log("info", `Culled ${count} manga(s)`);
  },
};

const sheetsSyncJob: CronJob & { hour: number; minute: number } = {
  label: "sheets-sync",
  hour: 6,
  minute: 0,
  handler: async () => {
    // Sheets sync implementation lives elsewhere; this is the cron hook.
    log("info", "Sheets sync triggered (no-op placeholder)");
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Start all cron jobs.  Call once at application start. */
export function startCronJobs(): void {
  // --- Hourly score update ---
  scoreUpdateJob.timer = setInterval(
    () => runSafe(scoreUpdateJob),
    scoreUpdateJob.intervalMs!,
  );
  // Run immediately on startup as well
  runSafe(scoreUpdateJob);

  // --- Daily cull at 02:00 ---
  scheduleDailyJob(cullJob);

  // --- Daily sheets sync at 06:00 ---
  scheduleDailyJob(sheetsSyncJob);

  log(
    "info",
    `Cron started. Jobs: ${jobs.length === 0 ? "score-update, cull, sheets-sync" : jobs.map((j) => j.label).join(", ")}`,
  );
}

/** Stop all running cron jobs.  Useful for graceful shutdown. */
export function stopCronJobs(): void {
  if (scoreUpdateJob.timer) clearInterval(scoreUpdateJob.timer as ReturnType<typeof setInterval>);
  if (cullJob.timer) clearTimeout(cullJob.timer as ReturnType<typeof setTimeout>);
  if (sheetsSyncJob.timer) clearTimeout(sheetsSyncJob.timer as ReturnType<typeof setTimeout>);
  log("info", "All cron jobs stopped.");
}
