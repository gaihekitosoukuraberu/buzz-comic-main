/**
 * GET /api/generate/[jobId]
 *
 * Returns the current status of a generation job.
 *
 * Response: {
 *   job_id: string
 *   status: "pending" | "running" | "done" | "failed"
 *   progress: number          // 0-100
 *   images: string[]          // populated when status === "done"
 *   error: string | null
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/flux/queue";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await getJobStatus(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    images: job.images,
    error: job.error,
    created_at: job.createdAt,
    completed_at: job.completedAt,
  });
}
