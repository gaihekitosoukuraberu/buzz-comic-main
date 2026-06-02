import { NextRequest, NextResponse } from "next/server";
import {
  syncMangaData,
  syncRevenueData,
  syncUserData,
  syncAllData,
  createMonthlyReport,
  type SyncResult,
} from "@/lib/sheets/sync";

type SyncType = "manga" | "revenue" | "users" | "all" | "monthly_report";

// POST /api/sheets/sync
// body: { type: 'manga' | 'revenue' | 'users' | 'all' | 'monthly_report', year?: number, month?: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type, year, month } = body as {
      type?: SyncType;
      year?: number;
      month?: number;
    };

    if (!type) {
      return NextResponse.json(
        { error: "type は必須です (manga | revenue | users | all | monthly_report)" },
        { status: 400 }
      );
    }

    let result: SyncResult | Record<string, SyncResult>;

    switch (type) {
      case "manga":
        result = await syncMangaData();
        break;
      case "revenue":
        result = await syncRevenueData();
        break;
      case "users":
        result = await syncUserData();
        break;
      case "all":
        result = await syncAllData();
        break;
      case "monthly_report":
        result = await createMonthlyReport(year, month);
        break;
      default:
        return NextResponse.json(
          { error: `不明なタイプ: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ type, result, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[api/sheets/sync] error:", error);
    return NextResponse.json(
      { error: "同期処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// GET /api/sheets/sync - 設定状況の確認
export async function GET() {
  const configured = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.SHEETS_SPREADSHEET_ID
  );

  return NextResponse.json({
    configured,
    spreadsheetId: configured ? process.env.SHEETS_SPREADSHEET_ID : null,
    message: configured
      ? "Google Sheets が設定済みです"
      : "Google Sheets が未設定です。環境変数を設定してください。",
  });
}
