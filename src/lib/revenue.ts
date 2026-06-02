/**
 * 収益計算エンジン
 *
 * NOTE: 分配率・単価は確定値ではありません。ユーザー確認後に定数を更新してください。
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// 収益定数（確定値ではない — ユーザー確認後に更新）
// ---------------------------------------------------------------------------
export const REVENUE_CPM_RATE = parseFloat(
  process.env.REVENUE_CPM_RATE ?? "0.5"
); // 円 / 1000 ビュー
export const REVENUE_MIN_PAYOUT = parseFloat(
  process.env.REVENUE_MIN_PAYOUT ?? "1000"
); // 最低振込金額（円）
export const REVENUE_SUBSCRIPTION_POOL = parseFloat(
  process.env.REVENUE_SUBSCRIPTION_POOL ?? "0"
); // サブスク分配プール（円/月、設定値）
export const REVENUE_PAYOUT_DAY = 25; // 毎月の振込予定日

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type RevenueType = "ad_view" | "tip" | "subscription_share";

export interface RevenueStats {
  userId: string;
  totalRevenue: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  monthOverMonthChange: number; // 前月比（%）
  byManga: MangaRevenueStat[];
}

export interface MangaRevenueStat {
  mangaId: string;
  mangaTitle: string;
  totalViews: number;
  revenue: number;
}

export interface SiteRevenueSummary {
  totalRevenue: number;
  currentMonthRevenue: number;
  creatorCount: number;
  topCreators: CreatorRevenueStat[];
}

export interface CreatorRevenueStat {
  userId: string;
  userName: string | null;
  totalRevenue: number;
  currentMonthRevenue: number;
}

// ---------------------------------------------------------------------------
// 収益計算
// ---------------------------------------------------------------------------

/**
 * CPM 広告収益を計算する
 * @param views ビュー数
 * @returns 収益（円）
 */
export function calculateAdRevenue(views: number): number {
  return (views / 1000) * REVENUE_CPM_RATE;
}

/**
 * サブスクリプション分配プールを総ビュー数に応じて分配する
 * @param mangaViews 各漫画のビュー数マップ { mangaId: views }
 * @returns 分配結果 { mangaId: amount }
 */
export function distributeSubscriptionPool(
  mangaViews: Record<string, number>
): Record<string, number> {
  const totalViews = Object.values(mangaViews).reduce((s, v) => s + v, 0);
  if (totalViews === 0 || REVENUE_SUBSCRIPTION_POOL === 0) return {};

  const result: Record<string, number> = {};
  for (const [mangaId, views] of Object.entries(mangaViews)) {
    result[mangaId] = (views / totalViews) * REVENUE_SUBSCRIPTION_POOL;
  }
  return result;
}

// ---------------------------------------------------------------------------
// データベース操作
// ---------------------------------------------------------------------------

/**
 * 今月公開漫画の広告収益を計算し Revenue レコードを作成する。
 * 既に当月 ad_view が存在する場合はスキップする。
 */
export async function distributeRevenue(): Promise<void> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const publishedMangas = await prisma.manga.findMany({
    where: { status: "published" },
    select: { id: true, totalViews: true, revenueTotal: true },
  });

  for (const manga of publishedMangas) {
    // 当月 ad_view が既にあればスキップ
    const existing = await prisma.revenue.findFirst({
      where: {
        mangaId: manga.id,
        type: "ad_view",
        recordedAt: { gte: monthStart, lte: monthEnd },
      },
    });
    if (existing) continue;

    const amount = calculateAdRevenue(manga.totalViews);
    if (amount <= 0) continue;

    await prisma.revenue.create({
      data: {
        mangaId: manga.id,
        amount,
        type: "ad_view",
        description: `${now.getFullYear()}年${now.getMonth() + 1}月 広告収益 (${manga.totalViews} views)`,
      },
    });

    // Manga の revenueTotal を更新
    await prisma.manga.update({
      where: { id: manga.id },
      data: { revenueTotal: manga.revenueTotal + amount },
    });

    // User の totalRevenue を更新
    const mangaWithAuthor = await prisma.manga.findUnique({
      where: { id: manga.id },
      select: { authorId: true, author: { select: { totalRevenue: true } } },
    });
    if (mangaWithAuthor) {
      await prisma.user.update({
        where: { id: mangaWithAuthor.authorId },
        data: { totalRevenue: mangaWithAuthor.author.totalRevenue + amount },
      });
    }
  }

  // サブスク分配
  if (REVENUE_SUBSCRIPTION_POOL > 0) {
    const viewsMap: Record<string, number> = {};
    for (const m of publishedMangas) viewsMap[m.id] = m.totalViews;

    const distribution = distributeSubscriptionPool(viewsMap);
    for (const [mangaId, amount] of Object.entries(distribution)) {
      if (amount <= 0) continue;

      const existingSub = await prisma.revenue.findFirst({
        where: {
          mangaId,
          type: "subscription_share",
          recordedAt: { gte: monthStart, lte: monthEnd },
        },
      });
      if (existingSub) continue;

      await prisma.revenue.create({
        data: {
          mangaId,
          amount,
          type: "subscription_share",
          description: `${now.getFullYear()}年${now.getMonth() + 1}月 サブスク分配`,
        },
      });

      const mangaRecord = await prisma.manga.findUnique({
        where: { id: mangaId },
        select: { revenueTotal: true, authorId: true, author: { select: { totalRevenue: true } } },
      });
      if (mangaRecord) {
        await prisma.manga.update({
          where: { id: mangaId },
          data: { revenueTotal: mangaRecord.revenueTotal + amount },
        });
        await prisma.user.update({
          where: { id: mangaRecord.authorId },
          data: { totalRevenue: mangaRecord.author.totalRevenue + amount },
        });
      }
    }
  }
}

/**
 * 指定クリエイターの収益統計を取得する
 */
export async function getCreatorRevenue(userId: string): Promise<RevenueStats> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ユーザーの漫画を取得
  const mangas = await prisma.manga.findMany({
    where: { authorId: userId },
    select: {
      id: true,
      title: true,
      totalViews: true,
      revenues: {
        select: { amount: true, recordedAt: true },
      },
    },
  });

  let totalRevenue = 0;
  let currentMonthRevenue = 0;
  let previousMonthRevenue = 0;
  const byManga: MangaRevenueStat[] = [];

  for (const manga of mangas) {
    let mangaTotal = 0;
    for (const rev of manga.revenues) {
      const at = new Date(rev.recordedAt);
      totalRevenue += rev.amount;
      mangaTotal += rev.amount;

      if (at >= currentMonthStart) {
        currentMonthRevenue += rev.amount;
      } else if (at >= prevMonthStart && at <= prevMonthEnd) {
        previousMonthRevenue += rev.amount;
      }
    }

    byManga.push({
      mangaId: manga.id,
      mangaTitle: manga.title,
      totalViews: manga.totalViews,
      revenue: mangaTotal,
    });
  }

  byManga.sort((a, b) => b.revenue - a.revenue);

  const monthOverMonthChange =
    previousMonthRevenue === 0
      ? currentMonthRevenue > 0
        ? 100
        : 0
      : ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

  return {
    userId,
    totalRevenue,
    currentMonthRevenue,
    previousMonthRevenue,
    monthOverMonthChange,
    byManga,
  };
}

/**
 * サイト全体の収益サマリーを取得する（管理者用）
 */
export async function getSiteRevenueSummary(): Promise<SiteRevenueSummary> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allRevenues = await prisma.revenue.findMany({
    select: { amount: true, recordedAt: true, manga: { select: { authorId: true } } },
  });

  let totalRevenue = 0;
  let currentMonthRevenue = 0;
  const creatorRevMap: Record<
    string,
    { total: number; currentMonth: number }
  > = {};

  for (const rev of allRevenues) {
    totalRevenue += rev.amount;
    const isCurrentMonth = new Date(rev.recordedAt) >= currentMonthStart;
    if (isCurrentMonth) currentMonthRevenue += rev.amount;

    const authorId = rev.manga.authorId;
    if (!creatorRevMap[authorId]) {
      creatorRevMap[authorId] = { total: 0, currentMonth: 0 };
    }
    creatorRevMap[authorId].total += rev.amount;
    if (isCurrentMonth) creatorRevMap[authorId].currentMonth += rev.amount;
  }

  const creatorIds = Object.keys(creatorRevMap);
  const users = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true },
  });
  const userMap: Record<string, string | null> = {};
  for (const u of users) userMap[u.id] = u.name;

  const topCreators: CreatorRevenueStat[] = creatorIds
    .map((userId) => ({
      userId,
      userName: userMap[userId] ?? null,
      totalRevenue: creatorRevMap[userId].total,
      currentMonthRevenue: creatorRevMap[userId].currentMonth,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 20);

  return {
    totalRevenue,
    currentMonthRevenue,
    creatorCount: creatorIds.length,
    topCreators,
  };
}

/**
 * 収益履歴を取得する（クリエイター用）
 */
export async function getRevenueHistory(
  userId: string,
  page = 1,
  pageSize = 20
) {
  const mangas = await prisma.manga.findMany({
    where: { authorId: userId },
    select: { id: true },
  });
  const mangaIds = mangas.map((m) => m.id);

  const [items, total] = await Promise.all([
    prisma.revenue.findMany({
      where: { mangaId: { in: mangaIds } },
      include: { manga: { select: { title: true } } },
      orderBy: { recordedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.revenue.count({ where: { mangaId: { in: mangaIds } } }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
