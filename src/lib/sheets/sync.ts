import { prisma } from "@/lib/db";
import { clearAndWriteToSheet, ensureSheet } from "./client";
import { format } from "date-fns";

export type SyncResult = {
  success: boolean;
  rowsWritten: number;
  message: string;
  skipped?: boolean;
};

// --- 漫画データの同期 ---
export async function syncMangaData(): Promise<SyncResult> {
  try {
    const sheetTitle = "漫画一覧";
    const sheetEnsured = await ensureSheet(sheetTitle);
    if (!sheetEnsured) {
      return { success: true, rowsWritten: 0, message: "Sheets未設定のためスキップ", skipped: true };
    }

    const mangas = await prisma.manga.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { panels: true, reviews: true } },
      },
    });

    const headers = [
      "ID",
      "タイトル",
      "作者名",
      "作者メール",
      "ステータス",
      "ジャンル",
      "タグ",
      "総閲覧数",
      "総いいね数",
      "総シェア数",
      "スコア",
      "収益合計",
      "パネル数",
      "レビュー数",
      "AI生成",
      "公開日",
      "作成日",
      "更新日",
    ];

    const rows = mangas.map((m) => [
      m.id,
      m.title,
      m.author?.name ?? "",
      m.author?.email ?? "",
      m.status,
      m.genre ?? "",
      m.tags ?? "[]",
      m.totalViews,
      m.totalLikes,
      m.totalShares,
      m.score,
      m.revenueTotal,
      m._count.panels,
      m._count.reviews,
      m.isAiGenerated ? "はい" : "いいえ",
      m.publishedAt ? format(m.publishedAt, "yyyy-MM-dd HH:mm") : "",
      format(m.createdAt, "yyyy-MM-dd HH:mm"),
      format(m.updatedAt, "yyyy-MM-dd HH:mm"),
    ]);

    const values = [headers, ...rows];
    const success = await clearAndWriteToSheet(`${sheetTitle}!A1`, values);

    return {
      success,
      rowsWritten: rows.length,
      message: success
        ? `${rows.length}件の漫画データを同期しました`
        : "書き込みに失敗しました",
    };
  } catch (error) {
    console.error("[sheets/sync] syncMangaData error:", error);
    return { success: false, rowsWritten: 0, message: `エラー: ${String(error)}` };
  }
}

// --- 収益データの同期 ---
export async function syncRevenueData(): Promise<SyncResult> {
  try {
    const sheetTitle = "収益データ";
    const sheetEnsured = await ensureSheet(sheetTitle);
    if (!sheetEnsured) {
      return { success: true, rowsWritten: 0, message: "Sheets未設定のためスキップ", skipped: true };
    }

    const revenues = await prisma.revenue.findMany({
      orderBy: { recordedAt: "desc" },
      include: {
        manga: { select: { id: true, title: true, authorId: true } },
      },
    });

    const headers = [
      "収益ID",
      "漫画ID",
      "漫画タイトル",
      "作者ID",
      "金額",
      "タイプ",
      "説明",
      "記録日時",
    ];

    const rows = revenues.map((r) => [
      r.id,
      r.mangaId,
      r.manga?.title ?? "",
      r.manga?.authorId ?? "",
      r.amount,
      r.type,
      r.description ?? "",
      format(r.recordedAt, "yyyy-MM-dd HH:mm"),
    ]);

    const values = [headers, ...rows];
    const success = await clearAndWriteToSheet(`${sheetTitle}!A1`, values);

    return {
      success,
      rowsWritten: rows.length,
      message: success
        ? `${rows.length}件の収益データを同期しました`
        : "書き込みに失敗しました",
    };
  } catch (error) {
    console.error("[sheets/sync] syncRevenueData error:", error);
    return { success: false, rowsWritten: 0, message: `エラー: ${String(error)}` };
  }
}

// --- ユーザーデータの同期 ---
export async function syncUserData(): Promise<SyncResult> {
  try {
    const sheetTitle = "ユーザー一覧";
    const sheetEnsured = await ensureSheet(sheetTitle);
    if (!sheetEnsured) {
      return { success: true, rowsWritten: 0, message: "Sheets未設定のためスキップ", skipped: true };
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { mangas: true } },
      },
    });

    const headers = [
      "ユーザーID",
      "メール",
      "名前",
      "ロール",
      "総収益",
      "漫画数",
      "登録日",
      "更新日",
    ];

    const rows = users.map((u) => [
      u.id,
      u.email,
      u.name ?? "",
      u.role,
      u.totalRevenue,
      u._count.mangas,
      format(u.createdAt, "yyyy-MM-dd HH:mm"),
      format(u.updatedAt, "yyyy-MM-dd HH:mm"),
    ]);

    const values = [headers, ...rows];
    const success = await clearAndWriteToSheet(`${sheetTitle}!A1`, values);

    return {
      success,
      rowsWritten: rows.length,
      message: success
        ? `${rows.length}件のユーザーデータを同期しました`
        : "書き込みに失敗しました",
    };
  } catch (error) {
    console.error("[sheets/sync] syncUserData error:", error);
    return { success: false, rowsWritten: 0, message: `エラー: ${String(error)}` };
  }
}

// --- 月次レポートの作成 ---
export async function createMonthlyReport(
  year?: number,
  month?: number
): Promise<SyncResult> {
  try {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1; // 1-indexed
    const monthStr = `${targetYear}年${String(targetMonth).padStart(2, "0")}月`;
    const sheetTitle = `月次レポート_${targetYear}${String(targetMonth).padStart(2, "0")}`;

    const sheetEnsured = await ensureSheet(sheetTitle);
    if (!sheetEnsured) {
      return { success: true, rowsWritten: 0, message: "Sheets未設定のためスキップ", skipped: true };
    }

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // 月内の統計を集計
    const [
      newMangaCount,
      publishedMangaCount,
      pendingMangaCount,
      newUserCount,
      revenues,
      topMangas,
    ] = await Promise.all([
      prisma.manga.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.manga.count({
        where: { status: "published", publishedAt: { gte: startDate, lte: endDate } },
      }),
      prisma.manga.count({ where: { status: "pending" } }),
      prisma.user.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.revenue.findMany({
        where: { recordedAt: { gte: startDate, lte: endDate } },
      }),
      prisma.manga.findMany({
        where: { status: "published" },
        orderBy: { totalViews: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          totalViews: true,
          totalLikes: true,
          revenueTotal: true,
        },
      }),
    ]);

    type RevenueRecord = { amount: number; type: string };
    const totalRevenue = revenues.reduce(
      (sum: number, r: RevenueRecord) => sum + r.amount,
      0
    );
    const revenueByType = revenues.reduce(
      (acc: Record<string, number>, r: RevenueRecord) => {
        acc[r.type] = (acc[r.type] ?? 0) + r.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const reportRows: (string | number | boolean | null)[][] = [
      [`${monthStr} 月次レポート`],
      ["作成日時", format(now, "yyyy-MM-dd HH:mm:ss")],
      [],
      ["== 漫画統計 =="],
      ["新規作成数", newMangaCount],
      ["公開数", publishedMangaCount],
      ["審査待ち件数（現在）", pendingMangaCount],
      [],
      ["== ユーザー統計 =="],
      ["新規登録数", newUserCount],
      [],
      ["== 収益統計 =="],
      ["総収益", totalRevenue],
      ...Object.entries(revenueByType).map(([type, amount]) => [
        `  ${type}`,
        amount,
      ]),
      [],
      ["== トップ10漫画（閲覧数順）=="],
      ["順位", "ID", "タイトル", "閲覧数", "いいね数", "収益"],
      ...topMangas.map((m, i) => [
        i + 1,
        m.id,
        m.title,
        m.totalViews,
        m.totalLikes,
        m.revenueTotal,
      ]),
    ];

    const success = await clearAndWriteToSheet(`${sheetTitle}!A1`, reportRows);

    return {
      success,
      rowsWritten: reportRows.length,
      message: success
        ? `${monthStr}の月次レポートを作成しました`
        : "月次レポートの作成に失敗しました",
    };
  } catch (error) {
    console.error("[sheets/sync] createMonthlyReport error:", error);
    return { success: false, rowsWritten: 0, message: `エラー: ${String(error)}` };
  }
}

// --- 全データ同期 ---
export async function syncAllData(): Promise<Record<string, SyncResult>> {
  const [manga, revenue, users] = await Promise.all([
    syncMangaData(),
    syncRevenueData(),
    syncUserData(),
  ]);

  return { manga, revenue, users };
}
