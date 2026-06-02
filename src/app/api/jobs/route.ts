/**
 * GET  /api/jobs           – List jobs for the current manga/user context
 * POST /api/jobs           – Enqueue a new job
 */

import { NextRequest, NextResponse } from "next/server";
import { enqueue, listJobs, type JobType } from "@/lib/queue/dispatcher";

// ---------------------------------------------------------------------------
// GET /api/jobs
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as Parameters<typeof listJobs>[0]["status"] | undefined;
    const type = searchParams.get("type") as JobType | undefined;
    const mangaId = searchParams.get("mangaId") ?? undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

    const { jobs, total } = await listJobs({ status, type, mangaId, limit, offset });

    return NextResponse.json({ jobs, total, limit, offset });
  } catch (error) {
    console.error("[GET /api/jobs] error:", error);
    return NextResponse.json({ error: "ジョブ一覧の取得に失敗しました" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/jobs
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      type?: unknown;
      payload?: unknown;
      runAt?: unknown;
      maxAttempts?: unknown;
      mangaId?: unknown;
    };

    const { type, payload, runAt, maxAttempts, mangaId } = body;

    const validTypes: JobType[] = [
      "flux_generate",
      "video_generate",
      "sns_post",
      "score_calc",
      "sheets_sync",
    ];

    if (!type || !validTypes.includes(type as JobType)) {
      return NextResponse.json(
        { error: `type は ${validTypes.join(" | ")} のいずれかを指定してください` },
        { status: 400 }
      );
    }

    const job = await enqueue(
      type as JobType,
      (payload as Record<string, unknown>) ?? {},
      {
        runAt: runAt ? new Date(runAt as string) : undefined,
        maxAttempts: typeof maxAttempts === "number" ? maxAttempts : undefined,
        mangaId: typeof mangaId === "string" ? mangaId : undefined,
      }
    );

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("[POST /api/jobs] error:", error);
    return NextResponse.json({ error: "ジョブの追加に失敗しました" }, { status: 500 });
  }
}
