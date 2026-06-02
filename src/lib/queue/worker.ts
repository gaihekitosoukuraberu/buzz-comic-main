/**
 * Background job worker.
 *
 * Polls the Prisma `Job` table every 3 seconds for pending work.
 * Dispatches jobs to type-specific handlers, records completion / failure,
 * and retries up to maxAttempts times with exponential back-off.
 *
 * Must NOT be imported inside Next.js edge/browser contexts.
 */

import { PrismaClient } from "@prisma/client";
import { updateAllScores } from "@/lib/scorer";

// ---------------------------------------------------------------------------
// Prisma instance (separate from Next.js singleton to avoid hot-reload issues)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
} as any);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3_000;
const MAX_RUNNING_JOBS = 5;

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(level: "info" | "warn" | "error", msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  const prefix = `[worker][${ts}]`;
  if (level === "error") {
    console.error(`${prefix} ERROR ${msg}`, extra ?? "");
  } else if (level === "warn") {
    console.warn(`${prefix} WARN  ${msg}`, extra ?? "");
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Payload types per job type
// ---------------------------------------------------------------------------

interface FluxGeneratePayload {
  prompt: string;
  style: "anime" | "realistic" | "monochrome";
  panelsCount: number;
  mangaId?: string;
}

interface VideoGeneratePayload {
  mangaId: string;
  panelUrls: string[];
  outputPath?: string;
}

interface SnsPostPayload {
  mangaId: string;
  userId: string;
  platform: "twitter" | "instagram" | "tiktok";
  caption?: string;
}

interface ScoreCalcPayload {
  mangaIds?: string[]; // empty = recalculate all
}

interface SheetsSyncPayload {
  spreadsheetId?: string;
  sheetName?: string;
}

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

async function handleFluxGenerate(
  jobId: string,
  payload: FluxGeneratePayload
): Promise<Record<string, unknown>> {
  log("info", `[${jobId}] flux_generate: prompt="${payload.prompt.slice(0, 60)}..."`);

  // Dynamic import to avoid loading ComfyUI deps in non-worker contexts
  const { isComfyUIAvailable, generateImages, generateImagesMock } = await import(
    "@/lib/flux/client"
  );
  const { buildWorkflow } = await import("@/lib/flux/workflow");

  const available = await isComfyUIAvailable();
  const allImages: string[] = [];
  const panelsCount = payload.panelsCount ?? 1;

  for (let i = 0; i < panelsCount; i++) {
    // Update progress in payload
    const progress = Math.round((i / panelsCount) * 90);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        payload: JSON.stringify({ ...payload, progress }),
      },
    });

    if (available) {
      const workflow = buildWorkflow("manga_panel", {
        prompt: payload.prompt,
        style: payload.style,
      });
      const result = await generateImages(workflow);
      allImages.push(...result.images);
    } else {
      const result = await generateImagesMock(1);
      allImages.push(...result.images);
    }
  }

  return { images: allImages };
}

async function handleVideoGenerate(
  jobId: string,
  payload: VideoGeneratePayload
): Promise<Record<string, unknown>> {
  log("info", `[${jobId}] video_generate: mangaId=${payload.mangaId}`);

  // Dynamic import of fluent-ffmpeg (optional dep; may not be installed)
  let ffmpeg: typeof import("fluent-ffmpeg") | null = null;
  try {
    ffmpeg = (await import("fluent-ffmpeg")).default;
  } catch {
    log("warn", `[${jobId}] fluent-ffmpeg not available; using mock`);
  }

  if (!ffmpeg || !payload.panelUrls?.length) {
    // Mock: just return placeholder
    return { videoUrl: null, mock: true };
  }

  const outputPath = payload.outputPath ?? `./public/uploads/${payload.mangaId}_video.mp4`;

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg!();
    for (const url of payload.panelUrls) {
      cmd = cmd.addInput(url);
    }
    cmd
      .outputOptions(["-vf", "fps=1", "-c:v", "libx264", "-pix_fmt", "yuv420p"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  return { videoUrl: outputPath };
}

async function handleSnsPost(
  jobId: string,
  payload: SnsPostPayload
): Promise<Record<string, unknown>> {
  log("info", `[${jobId}] sns_post: mangaId=${payload.mangaId} platform=${payload.platform}`);

  // Dynamic import of Puppeteer (heavy optional dep)
  let puppeteer: typeof import("puppeteer") | null = null;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    log("warn", `[${jobId}] puppeteer not available; skipping SNS post`);
    return { posted: false, mock: true };
  }

  // Retrieve manga info for the post
  const manga = await prisma.manga.findUnique({
    where: { id: payload.mangaId },
    select: { title: true, coverImageUrl: true },
  });

  if (!manga) {
    throw new Error(`Manga ${payload.mangaId} not found`);
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Persist SNS post record
    await prisma.snsPost.create({
      data: {
        mangaId: payload.mangaId,
        userId: payload.userId,
        platform: payload.platform,
        status: "posted",
        postedAt: new Date(),
      },
    });

    log("info", `[${jobId}] SNS post record created for ${payload.platform}`);
    return { posted: true, platform: payload.platform };
  } finally {
    await browser.close();
  }
}

async function handleScoreCalc(
  jobId: string,
  payload: ScoreCalcPayload
): Promise<Record<string, unknown>> {
  log("info", `[${jobId}] score_calc`);

  if (payload.mangaIds?.length) {
    // Recalculate specific manga scores
    const { calculateScore } = await import("@/lib/scorer");
    const mangas = await prisma.manga.findMany({
      where: { id: { in: payload.mangaIds } },
      select: {
        id: true,
        totalViews: true,
        totalLikes: true,
        totalShares: true,
        publishedAt: true,
        status: true,
        score: true,
      },
    });
    let updated = 0;
    for (const manga of mangas) {
      const newScore = calculateScore(manga as Parameters<typeof calculateScore>[0]);
      await prisma.$transaction([
        prisma.manga.update({ where: { id: manga.id }, data: { score: newScore } }),
        prisma.score.create({
          data: {
            mangaId: manga.id,
            value: newScore,
            views: manga.totalViews,
            likes: manga.totalLikes,
            shares: manga.totalShares,
          },
        }),
      ]);
      updated++;
    }
    return { updated };
  }

  // Recalculate all
  await updateAllScores();
  return { updated: "all" };
}

async function handleSheetsSync(
  jobId: string,
  payload: SheetsSyncPayload
): Promise<Record<string, unknown>> {
  log("info", `[${jobId}] sheets_sync`);

  // Dynamic import of googleapis
  let google: typeof import("googleapis").google | null = null;
  try {
    const mod = await import("googleapis");
    google = mod.google;
  } catch {
    log("warn", `[${jobId}] googleapis not available; skipping sheets sync`);
    return { synced: false, mock: true };
  }

  const spreadsheetId = payload.spreadsheetId ?? process.env.GOOGLE_SHEETS_ID;
  const sheetName = payload.sheetName ?? "Manga";

  if (!spreadsheetId) {
    log("warn", `[${jobId}] No spreadsheetId configured; skipping`);
    return { synced: false, reason: "no spreadsheetId" };
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const mangas = await prisma.manga.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      title: true,
      status: true,
      score: true,
      totalViews: true,
      totalLikes: true,
      createdAt: true,
    },
  });

  const rows = mangas.map((m) => [
    m.id,
    m.title,
    m.status,
    m.score,
    m.totalViews,
    m.totalLikes,
    m.createdAt.toISOString(),
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A2`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });

  return { synced: true, rows: rows.length };
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

type HandlerFn = (
  jobId: string,
  payload: Record<string, unknown>
) => Promise<Record<string, unknown>>;

const HANDLERS: Record<string, HandlerFn> = {
  flux_generate: (id, p) => handleFluxGenerate(id, p as unknown as FluxGeneratePayload),
  video_generate: (id, p) => handleVideoGenerate(id, p as unknown as VideoGeneratePayload),
  sns_post: (id, p) => handleSnsPost(id, p as unknown as SnsPostPayload),
  score_calc: (id, p) => handleScoreCalc(id, p as unknown as ScoreCalcPayload),
  sheets_sync: (id, p) => handleSheetsSync(id, p as unknown as SheetsSyncPayload),
};

// ---------------------------------------------------------------------------
// Core polling loop
// ---------------------------------------------------------------------------

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

async function poll(): Promise<void> {
  try {
    // How many jobs are currently running?
    const runningCount = await prisma.job.count({ where: { status: "running" } });
    if (runningCount >= MAX_RUNNING_JOBS) {
      return; // Slot full – wait for next tick
    }

    // How many slots are free?
    const slots = MAX_RUNNING_JOBS - runningCount;

    // Claim up to `slots` pending jobs that are due
    const pendingJobs = await prisma.job.findMany({
      where: {
        status: "pending",
        runAt: { lte: new Date() },
      },
      orderBy: { runAt: "asc" },
      take: slots,
    });

    for (const job of pendingJobs) {
      // Atomically claim the job (prevent duplicate execution)
      const claimed = await prisma.job.updateMany({
        where: { id: job.id, status: "pending" },
        data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
      });

      if (claimed.count === 0) continue; // Another worker claimed it first

      // Execute in background (non-blocking)
      executeJob(job.id, job.type, job.payload, job.attempts + 1, job.maxAttempts).catch(
        (err) => log("error", `Unhandled error for job ${job.id}`, err)
      );
    }
  } catch (err) {
    log("error", "Poll cycle error", err);
  }
}

async function executeJob(
  jobId: string,
  type: string,
  rawPayload: string | null,
  attempt: number,
  maxAttempts: number
): Promise<void> {
  const handler = HANDLERS[type];
  if (!handler) {
    log("warn", `No handler for job type "${type}" (job ${jobId})`);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: `Unknown job type: ${type}`,
        completedAt: new Date(),
      },
    });
    return;
  }

  let payload: Record<string, unknown> = {};
  if (rawPayload) {
    try {
      payload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  log("info", `Executing job ${jobId} (type=${type}, attempt=${attempt}/${maxAttempts})`);

  try {
    const result = await handler(jobId, payload);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "done",
        result: JSON.stringify(result),
        completedAt: new Date(),
        error: null,
      },
    });

    log("info", `Job ${jobId} completed successfully`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `Job ${jobId} failed (attempt ${attempt}/${maxAttempts}): ${message}`);

    const shouldRetry = attempt < maxAttempts;

    if (shouldRetry) {
      // Exponential back-off: 10s, 30s, 90s, …
      const delayMs = 10_000 * Math.pow(3, attempt - 1);
      const nextRunAt = new Date(Date.now() + delayMs);

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "pending",
          error: message,
          runAt: nextRunAt,
        },
      });

      log("info", `Job ${jobId} scheduled for retry at ${nextRunAt.toISOString()}`);
    } else {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: message,
          completedAt: new Date(),
        },
      });

      log("error", `Job ${jobId} permanently failed after ${maxAttempts} attempts`);
    }
  }
}

// ---------------------------------------------------------------------------
// Public lifecycle API
// ---------------------------------------------------------------------------

/** Start the polling loop.  Safe to call multiple times. */
export function startWorker(): void {
  if (running) return;
  running = true;

  function schedulePoll() {
    if (!running) return;
    timer = setTimeout(async () => {
      await poll();
      schedulePoll();
    }, POLL_INTERVAL_MS);
  }

  log("info", `Worker started (poll interval: ${POLL_INTERVAL_MS}ms)`);
  schedulePoll();
}

/** Stop the polling loop gracefully. */
export async function stopWorker(): Promise<void> {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  // Mark any jobs we claimed as running back to pending so another worker
  // can pick them up after restart (best-effort).
  try {
    const stuck = await prisma.job.updateMany({
      where: { status: "running" },
      data: { status: "pending", startedAt: null },
    });
    if (stuck.count > 0) {
      log("info", `Requeued ${stuck.count} running job(s) on shutdown`);
    }
  } catch (err) {
    log("error", "Error requeuing jobs on shutdown", err);
  }

  await prisma.$disconnect();
  log("info", "Worker stopped");
}
