/**
 * POST /api/admin/jobs/retry
 *
 * Body (optional):
 *   { ids?: string[] }   – specific job IDs to retry
 *                          (omit to retry ALL failed jobs)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    let ids: string[] | undefined;

    try {
      const body = await request.json() as { ids?: string[] };
      ids = body.ids;
    } catch {
      // Empty body is fine
    }

    const where = {
      status: "failed" as const,
      ...(ids?.length ? { id: { in: ids } } : {}),
    };

    // Reset failed jobs to pending, reset attempts counter
    const { count } = await prisma.job.updateMany({
      where,
      data: {
        status: "pending",
        attempts: 0,
        error: null,
        startedAt: null,
        completedAt: null,
        runAt: new Date(), // run immediately
      },
    });

    return NextResponse.json({ retried: count });
  } catch (error) {
    console.error("[POST /api/admin/jobs/retry] error:", error);
    return NextResponse.json({ error: "ジョブの再試行に失敗しました" }, { status: 500 });
  }
}
