import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [
      pendingCount,
      publishedCount,
      culledCount,
      totalMangas,
      totalUsers,
      revenueResult,
      recentReviews,
      recentMangas,
    ] = await Promise.all([
      prisma.manga.count({ where: { status: "pending" } }),
      prisma.manga.count({ where: { status: "published" } }),
      prisma.manga.count({ where: { status: "culled" } }),
      prisma.manga.count(),
      prisma.user.count(),
      prisma.revenue.aggregate({ _sum: { amount: true } }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          manga: { select: { id: true, title: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.manga.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          author: { select: { name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        pendingCount,
        publishedCount,
        culledCount,
        totalMangas,
        totalUsers,
        totalRevenue: revenueResult._sum.amount ?? 0,
      },
      recentActivity: {
        reviews: recentReviews,
        mangas: recentMangas,
      },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "統計の取得に失敗しました" },
      { status: 500 }
    );
  }
}
