/**
 * Generation queue manager backed by the Prisma `Job` table.
 *
 * - Max 3 concurrent generations
 * - 5-minute timeout per job
 * - Falls back to mock mode when ComfyUI is unavailable
 *
 * Job.payload shape: { prompt, style, panelsCount, progress }
 * Job.result shape : { images: string[] }
 */

import { prisma } from "@/lib/db";
import {
  generateImages,
  generateImagesMock,
  isComfyUIAvailable,
} from "@/lib/flux/client";
import { buildWorkflow, type MangaStyle } from "@/lib/flux/workflow";

const MAX_PARALLEL = 3;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const JOB_TYPE = "flux_generate";

// -------------------------------------------------------------------
// Public types
// -------------------------------------------------------------------

export interface EnqueueOptions {
  mangaId?: string;
  prompt: string;
  style: MangaStyle;
  panelsCount: number;
}

export interface JobRecord {
  id: string;
  status: string;
  progress: number;
  images: string[];
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// -------------------------------------------------------------------
// Enqueue a new generation job
// -------------------------------------------------------------------

export async function enqueueGenerationJob(
  opts: EnqueueOptions
): Promise<JobRecord> {
  const job = await prisma.job.create({
    data: {
      type: JOB_TYPE,
      status: "pending",
      mangaId: opts.mangaId ?? null,
      payload: JSON.stringify({
        prompt: opts.prompt,
        style: opts.style,
        panelsCount: opts.panelsCount,
        progress: 0,
      }),
    },
  });

  // Fire-and-forget: start processing without blocking the response
  processJob(job.id, opts).catch((err) => {
    console.error(`[queue] Job ${job.id} unhandled error:`, err);
  });

  return toJobRecord(job);
}

// -------------------------------------------------------------------
// Internal job processor
// -------------------------------------------------------------------

async function processJob(jobId: string, opts: EnqueueOptions): Promise<void> {
  // Check concurrency limit
  const runningCount = await prisma.job.count({
    where: { type: JOB_TYPE, status: "running" },
  });

  if (runningCount >= MAX_PARALLEL) {
    // Stay pending; will be resumed when a slot opens
    return;
  }

  // Atomically mark as running
  await setPayloadProgress(jobId, opts, 0, "running");

  const deadline = Date.now() + TIMEOUT_MS;

  try {
    const available = await isComfyUIAvailable();
    const allImages: string[] = [];

    for (let i = 0; i < opts.panelsCount; i++) {
      if (Date.now() > deadline) {
        throw new Error("Job timed out after 5 minutes");
      }

      // Update progress (0–90% spread across panels, last 10% for finalization)
      const progress = Math.round((i / opts.panelsCount) * 90);
      await setPayloadProgress(jobId, opts, progress, "running");

      if (!available) {
        const result = await generateImagesMock(1);
        allImages.push(...result.images);
      } else {
        const workflow = buildWorkflow("manga_panel", {
          prompt: opts.prompt,
          style: opts.style,
        });
        const result = await generateImages(workflow);
        allImages.push(...result.images);
      }
    }

    // Complete the job
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "done",
        payload: JSON.stringify({
          prompt: opts.prompt,
          style: opts.style,
          panelsCount: opts.panelsCount,
          progress: 100,
        }),
        result: JSON.stringify({ images: allImages }),
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: message,
        completedAt: new Date(),
      },
    });
  } finally {
    // Try to start the next pending job
    void kickPendingJob();
  }
}

// -------------------------------------------------------------------
// Helper: update payload (with progress) and optionally status
// -------------------------------------------------------------------

async function setPayloadProgress(
  jobId: string,
  opts: EnqueueOptions,
  progress: number,
  status?: string
): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      ...(status ? { status } : {}),
      ...(status === "running" ? { startedAt: new Date() } : {}),
      payload: JSON.stringify({
        prompt: opts.prompt,
        style: opts.style,
        panelsCount: opts.panelsCount,
        progress,
      }),
    },
  });
}

// -------------------------------------------------------------------
// Resume the oldest pending job when a slot is free
// -------------------------------------------------------------------

async function kickPendingJob(): Promise<void> {
  const runningCount = await prisma.job.count({
    where: { type: JOB_TYPE, status: "running" },
  });
  if (runningCount >= MAX_PARALLEL) return;

  const pending = await prisma.job.findFirst({
    where: { type: JOB_TYPE, status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  if (!pending?.payload) return;

  const payload = JSON.parse(pending.payload) as EnqueueOptions & {
    progress?: number;
  };
  await processJob(pending.id, {
    prompt: payload.prompt,
    style: payload.style,
    panelsCount: payload.panelsCount,
    mangaId: pending.mangaId ?? undefined,
  });
}

// -------------------------------------------------------------------
// Get current status of a job
// -------------------------------------------------------------------

export async function getJobStatus(jobId: string): Promise<JobRecord | null> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return null;
  return toJobRecord(job);
}

// -------------------------------------------------------------------
// Map Prisma Job → public JobRecord
// -------------------------------------------------------------------

function toJobRecord(job: {
  id: string;
  status: string;
  payload?: string | null;
  result?: string | null;
  error?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}): JobRecord {
  let progress = 0;
  if (job.payload) {
    try {
      const p = JSON.parse(job.payload) as { progress?: number };
      progress = p.progress ?? 0;
    } catch {
      progress = 0;
    }
  }

  let images: string[] = [];
  if (job.result) {
    try {
      const r = JSON.parse(job.result) as { images?: string[] };
      images = r.images ?? [];
    } catch {
      images = [];
    }
  }

  return {
    id: job.id,
    status: job.status,
    progress,
    images,
    error: job.error ?? null,
    createdAt: job.createdAt,
    completedAt: job.completedAt ?? null,
  };
}
