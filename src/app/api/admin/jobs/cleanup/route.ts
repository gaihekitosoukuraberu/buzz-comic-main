/**
 * DELETE /api/admin/jobs/cleanup
 *
 * Query params:
 *   olderThanDays  – delete completed/cancelled jobs older than N days (default: 7)
 *   status         – comma-separated list of statuses to clean (default: done,cancelled)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThanDays = Math.max(
      0,
      parseInt(searchParams.get("olderThanDays") ?? "7", 10)
    );
    const statusParam = searchParams.get("status") ?? "done,cancelled";
    const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean);

    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const { count } = await prisma.job.deleteMany({
      where: {
        status: { in: statuses },
        completedAt: { lte: cutoff },
      },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error("[DELETE /api/admin/jobs/cleanup] error:", error);
    return NextResponse.json({ error: "ジョブの削除に失敗しました" }, { status: 500 });
  }
}
