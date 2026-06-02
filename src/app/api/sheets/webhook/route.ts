import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GASからのウェブフック受信
// POST /api/sheets/webhook

type WebhookPayload = {
  event: "pending_review_check" | "sync_request" | "monthly_report_request";
  data?: Record<string, unknown>;
  secret?: string;
  timestamp?: string;
};

function verifyWebhookSecret(secret?: string): boolean {
  const expected = process.env.GAS_WEBHOOK_SECRET;
  // シークレットが未設定の場合は検証をスキップ（開発用）
  if (!expected) return true;
  return secret === expected;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "リクエストボディが無効です" }, { status: 400 });
    }

    const payload = body as WebhookPayload;

    if (!verifyWebhookSecret(payload.secret)) {
      console.warn("[api/sheets/webhook] Invalid webhook secret");
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    console.log(`[api/sheets/webhook] Received event: ${payload.event}`, {
      timestamp: payload.timestamp,
    });

    switch (payload.event) {
      case "pending_review_check": {
        // GASが審査待ち漫画の件数を問い合わせる
        const pendingCount = await prisma.manga.count({
          where: { status: "pending" },
        });

        const pendingMangas = await prisma.manga.findMany({
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
          take: 10,
          select: {
            id: true,
            title: true,
            createdAt: true,
            author: { select: { name: true, email: true } },
          },
        });

        return NextResponse.json({
          event: "pending_review_check",
          pendingCount,
          pendingMangas: pendingMangas.map((m) => ({
            id: m.id,
            title: m.title,
            authorName: m.author?.name ?? "不明",
            authorEmail: m.author?.email ?? "",
            createdAt: m.createdAt.toISOString(),
          })),
          checkedAt: new Date().toISOString(),
        });
      }

      case "sync_request": {
        // GASからの同期リクエスト（非同期で実行、即座にレスポンス）
        // 実際の同期は /api/sheets/sync に委任
        return NextResponse.json({
          event: "sync_request",
          message: "同期リクエストを受け付けました。/api/sheets/sync を直接呼び出してください。",
          syncEndpoint: "/api/sheets/sync",
          receivedAt: new Date().toISOString(),
        });
      }

      case "monthly_report_request": {
        // GASから月次レポート作成リクエスト
        return NextResponse.json({
          event: "monthly_report_request",
          message: "月次レポートリクエストを受け付けました。",
          reportEndpoint: "/api/sheets/sync",
          reportPayload: { type: "monthly_report" },
          receivedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: `不明なイベント: ${(payload as { event: string }).event}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[api/sheets/webhook] error:", error);
    return NextResponse.json(
      { error: "ウェブフック処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// GET /api/sheets/webhook - 疎通確認
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/sheets/webhook",
    supportedEvents: [
      "pending_review_check",
      "sync_request",
      "monthly_report_request",
    ],
  });
}
