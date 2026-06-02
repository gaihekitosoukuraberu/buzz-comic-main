/**
 * GET    /api/jobs/[id]  – Job details
 * DELETE /api/jobs/[id]  – Cancel a pending job
 */

import { NextRequest, NextResponse } from "next/server";
import { getJobStatus, cancelJob } from "@/lib/queue/dispatcher";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/jobs/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const job = await getJobStatus(id);

    if (!job) {
      return NextResponse.json({ error: "ジョブが見つかりません" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("[GET /api/jobs/[id]] error:", error);
    return NextResponse.json({ error: "ジョブ詳細の取得に失敗しました" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/jobs/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const job = await cancelJob(id);

    if (!job) {
      return NextResponse.json(
        { error: "ジョブが見つからないか、キャンセルできない状態です" },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("[DELETE /api/jobs/[id]] error:", error);
    return NextResponse.json({ error: "ジョブのキャンセルに失敗しました" }, { status: 500 });
  }
}
