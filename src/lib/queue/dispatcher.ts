/**
 * Job Dispatcher – enqueue / query / cancel jobs in the Prisma `Job` table.
 *
 * This is the single source of truth for adding work items to the queue.
 * The background worker (worker.ts) polls the table and executes each job.
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobType =
  | "flux_generate"
  | "video_generate"
  | "sns_post"
  | "score_calc"
  | "sheets_sync";

export type JobStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export interface EnqueueOptions {
  /** ISO date string or Date – defaults to now */
  runAt?: Date | string;
  /** Max retry attempts before the job is marked failed (default: 3) */
  maxAttempts?: number;
  /** Optional manga association */
  mangaId?: string;
}

export interface JobInfo {
  id: string;
  type: JobType;
  status: JobStatus;
  mangaId: string | null;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toJobInfo(job: {
  id: string;
  type: string;
  status: string;
  mangaId: string | null;
  payload: string | null;
  result: string | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}): JobInfo {
  return {
    id: job.id,
    type: job.type as JobType,
    status: job.status as JobStatus,
    mangaId: job.mangaId,
    payload: parseJson(job.payload),
    result: parseJson(job.result),
    error: job.error,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add a job to the queue.
 *
 * @param type    One of the supported job types
 * @param payload Arbitrary JSON payload consumed by the handler
 * @param options Scheduling / retry options
 */
export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {}
): Promise<JobInfo> {
  const job = await prisma.job.create({
    data: {
      type,
      status: "pending",
      mangaId: options.mangaId ?? null,
      payload: JSON.stringify(payload),
      maxAttempts: options.maxAttempts ?? 3,
      runAt: options.runAt ? new Date(options.runAt) : new Date(),
    },
  });

  return toJobInfo(job);
}

/**
 * Retrieve the current state of a single job.
 */
export async function getJobStatus(id: string): Promise<JobInfo | null> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return null;
  return toJobInfo(job);
}

/**
 * Cancel a pending job.  Running jobs are NOT interrupted – only status is
 * updated.  Returns null if the job does not exist or is not cancellable.
 */
export async function cancelJob(id: string): Promise<JobInfo | null> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return null;

  if (!["pending"].includes(job.status)) {
    // Cannot cancel a running / completed / already-cancelled job
    return null;
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      status: "cancelled",
      completedAt: new Date(),
    },
  });

  return toJobInfo(updated);
}

/**
 * List jobs with optional filters.
 */
export async function listJobs(opts: {
  status?: JobStatus;
  type?: JobType;
  mangaId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: JobInfo[]; total: number }> {
  const where = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.mangaId ? { mangaId: opts.mangaId } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 50,
      skip: opts.offset ?? 0,
    }),
  ]);

  return { jobs: rows.map(toJobInfo), total };
}
