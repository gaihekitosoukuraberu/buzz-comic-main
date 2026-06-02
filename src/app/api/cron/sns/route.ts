import { NextRequest, NextResponse } from "next/server";
import { runScheduledPosts } from "@/lib/sns/scheduler";

/**
 * GET /api/cron/sns
 * Vercel Cron などから呼ばれる SNS 自動投稿エンドポイント
 * CRON_SECRET ヘッダーで保護
 *
 * vercel.json に以下を追加して使用:
 * {
 *   "crons": [{ "path": "/api/cron/sns", "schedule": "0 * * * *" }]
 * }
 */
export async function GET(request: NextRequest) {
  // CRON_SECRET による認証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  console.log("[cron/sns] SNS スケジュール投稿開始");

  try {
    const result = await runScheduledPosts();

    console.log("[cron/sns] 完了:", result);

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    console.error("[cron/sns] エラー:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Vercel Cron は GET を使用するが、手動テスト用に POST も対応
export async function POST(request: NextRequest) {
  return GET(request);
}
