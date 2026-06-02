import { prisma } from "@/lib/db";
import StatsCard from "@/components/admin/StatsCard";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

async function getStats() {
  const [
    pendingCount,
    publishedCount,
    culledCount,
    totalUsers,
    revenueResult,
    recentMangas,
    recentReviews,
  ] = await Promise.all([
    prisma.manga.count({ where: { status: "pending" } }),
    prisma.manga.count({ where: { status: "published" } }),
    prisma.manga.count({ where: { status: "culled" } }),
    prisma.user.count(),
    prisma.revenue.aggregate({ _sum: { amount: true } }),
    prisma.manga.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        author: { select: { name: true, email: true } },
      },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        manga: { select: { id: true, title: true } },
        reviewer: { select: { name: true, email: true } },
      },
    }),
  ]);

  return {
    pendingCount,
    publishedCount,
    culledCount,
    totalUsers,
    totalRevenue: revenueResult._sum.amount ?? 0,
    recentMangas,
    recentReviews,
  };
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "審査待ち", className: "bg-amber-100 text-amber-700" },
  published: { label: "公開中", className: "bg-green-100 text-green-700" },
  culled: { label: "間引き済み", className: "bg-gray-100 text-gray-600" },
  rejected: { label: "却下", className: "bg-red-100 text-red-700" },
  draft: { label: "下書き", className: "bg-blue-100 text-blue-700" },
};

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="mt-1 text-sm text-gray-500">Buzz Comic 管理概要</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="審査待ち"
          value={stats.pendingCount}
          description="承認・却下を待つ漫画"
          variant="warning"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="公開中"
          value={stats.publishedCount}
          description="現在公開されている漫画"
          variant="success"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatsCard
          title="間引き済み"
          value={stats.culledCount}
          description="スコアによる間引き"
          variant="default"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        />
        <StatsCard
          title="総収益"
          value={`¥${stats.totalRevenue.toLocaleString()}`}
          description="全期間の累計収益"
          variant="success"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">クイックアクション</h3>
          <div className="space-y-3">
            <Link
              href="/admin/review"
              className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              審査キューを確認 ({stats.pendingCount}件)
            </Link>
            <Link
              href="/admin/manga"
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              漫画管理
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              ユーザー管理 ({stats.totalUsers}名)
            </Link>
            <Link
              href="/admin/revenue"
              className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              収益管理
            </Link>
          </div>
        </div>

        {/* Recent manga */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">最近の漫画投稿</h3>
          {stats.recentMangas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">データなし</p>
          ) : (
            <div className="space-y-3">
              {stats.recentMangas.map((manga) => {
                const s = statusLabels[manga.status] ?? { label: manga.status, className: "bg-gray-100 text-gray-600" };
                return (
                  <div key={manga.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{manga.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {manga.author.name ?? manga.author.email} · {formatDateTime(manga.createdAt)}
                      </p>
                    </div>
                    <span className={`ml-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
