#!/usr/bin/env node
/**
 * Background video generation worker.
 *
 * Polls the Job table for pending video_generate jobs, executes them
 * using the generateMangaVideo engine, and updates the Job record with
 * the result or error.
 *
 * Run:
 *   node --experimental-strip-types scripts/video-worker.ts
 *   # or via ts-node:
 *   npx ts-node --esm scripts/video-worker.ts
 *
 * Environment:
 *   DATABASE_URL  – Prisma database URL (falls back to prisma.config.ts default)
 *   POLL_INTERVAL – ms between polls, default 5000
 *   WORKER_CONCURRENCY – max parallel jobs, default 2
 */

import path from 'path';
import {
  generateMangaVideo,
  publicUrlToFilePath,
  videoFilePathToUrl,
} from '../src/lib/video/generator.js';

// Re-use the shared Prisma singleton from the application.
// When running with ts-node / --experimental-strip-types the path alias
// '@/' is not available, so we import by relative path.
import { prisma } from '../src/lib/db.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '5000', 10);
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10);

// ---------------------------------------------------------------------------
// Job processing
// ---------------------------------------------------------------------------

interface VideoJobPayload {
  manga_id: string;
  format: 'vertical' | 'square';
  title: string;
  author_id: string;
  panel_count: number;
}

async function processJob(jobId: string): Promise<void> {
  // Mark job as running
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'running',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job || !job.mangaId || !job.payload) {
    throw new Error(`Job ${jobId} missing required fields`);
  }

  const payload = JSON.parse(job.payload) as VideoJobPayload;
  const { manga_id, format } = payload;

  // Load manga + panels from DB
  const manga = await prisma.manga.findUnique({
    where: { id: manga_id },
    include: {
      panels: { orderBy: { order: 'asc' } },
      author: { select: { name: true, email: true } },
    },
  });

  if (!manga) throw new Error(`Manga ${manga_id} not found`);
  if (!manga.panels.length) throw new Error(`Manga ${manga_id} has no panels`);

  // Resolve panel image paths from stored public URLs
  const panelPaths = manga.panels.map((p) => {
    // imageUrl may be a public URL like /uploads/... or an absolute path
    if (path.isAbsolute(p.imageUrl)) return p.imageUrl;
    return publicUrlToFilePath(p.imageUrl);
  });

  const authorName = manga.author?.name ?? manga.author?.email ?? 'Unknown';

  console.log(
    `[video-worker] processing job=${jobId} manga=${manga_id} format=${format} panels=${panelPaths.length}`
  );

  const outputPath = await generateMangaVideo({
    mangaId: manga_id,
    panels: panelPaths,
    title: manga.title,
    author: authorName,
    format,
    panelDuration: 3,
  });

  const videoUrl = videoFilePathToUrl(outputPath);

  // Mark job done with result
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'done',
      completedAt: new Date(),
      result: JSON.stringify({ video_url: videoUrl, output_path: outputPath }),
    },
  });

  console.log(`[video-worker] job=${jobId} done -> ${videoUrl}`);
}

async function failJob(jobId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[video-worker] job=${jobId} failed:`, message);

  // Fetch current attempt count to decide whether to requeue
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const exhausted = job.attempts >= job.maxAttempts;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: exhausted ? 'failed' : 'pending',
      completedAt: exhausted ? new Date() : null,
      error: message,
    },
  });
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

const activeJobs = new Set<string>();

async function poll(): Promise<void> {
  if (activeJobs.size >= WORKER_CONCURRENCY) return;

  const available = WORKER_CONCURRENCY - activeJobs.size;

  const jobs = await prisma.job.findMany({
    where: {
      type: 'video_generate',
      status: 'pending',
      runAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: available,
  });

  for (const job of jobs) {
    if (activeJobs.has(job.id)) continue;
    activeJobs.add(job.id);

    processJob(job.id)
      .catch((err) => failJob(job.id, err))
      .finally(() => activeJobs.delete(job.id));
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `[video-worker] starting  poll_interval=${POLL_INTERVAL}ms  concurrency=${WORKER_CONCURRENCY}`
  );

  // Initial poll
  await poll();

  // Recurring poll
  const timer = setInterval(() => {
    poll().catch((err) => console.error('[video-worker] poll error:', err));
  }, POLL_INTERVAL);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[video-worker] ${signal} received, shutting down…`);
    clearInterval(timer);
    // Wait for active jobs to finish (up to 60 s)
    let waited = 0;
    while (activeJobs.size > 0 && waited < 60_000) {
      await new Promise((r) => setTimeout(r, 500));
      waited += 500;
    }
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[video-worker] fatal:', err);
  process.exit(1);
});
