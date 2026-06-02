/**
 * Admin Job API
 *
 * GET    /api/admin/jobs           – All jobs (with filters)
 * POST   /api/admin/jobs/retry     – Retry failed jobs
 * DELETE /api/admin/jobs/cleanup   – Delete completed / cancelled jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listJobs, type JobType, type JobStatus } from "@/lib/queue/dispatcher";

// ---------------------------------------------------------------------------
// GET /api/admin/jobs
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? undefined) as JobStatus | undefined;
    const type = (searchParams.get("type") ?? undefined) as JobType | undefined;
    const mangaId = searchParams.get("mangaId") ?? undefined;
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

    const { jobs, total } = await listJobs({ status, type, mangaId, limit, offset });

    // Also return counts per status for the dashboard
    const [pending, running, done, failed, cancelled] = await Promise.all([
      prisma.job.count({ where: { status: "pending" } }),
      prisma.job.count({ where: { status: "running" } }),
      prisma.job.count({ where: { status: "done" } }),
      prisma.job.count({ where: { status: "failed" } }),
      prisma.job.count({ where: { status: "cancelled" } }),
    ]);

    return NextResponse.json({
      jobs,
      total,
      limit,
      offset,
      counts: { pending, running, done, failed, cancelled },
    });
  } catch (error) {
    console.error("[GET /api/admin/jobs] error:", error);
    return NextResponse.json({ error: "ジョブ一覧の取得に失敗しました" }, { status: 500 });
  }
}
