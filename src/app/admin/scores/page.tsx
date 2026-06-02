/**
 * Admin Score Management Page
 * /admin/scores
 */

import { prisma } from "@/lib/db";
import { type ScoreTableRow } from "@/components/admin/ScoreTable";
import { ScoreStatsCards } from "@/components/admin/ScoreStatsCards";
import { ScoreTableClient } from "@/components/admin/ScoreTableClient";

async function getScoreData() {
  const [mangas, publishedCount, culledCount, avgResult] = await Promise.all([
    prisma.manga.findMany({
      select: {
        id: true,
        title: true,
        totalViews: true,
        totalLikes: true,
        totalShares: true,
        score: true,
        publishedAt: true,
        status: true,
      },
      orderBy: { score: "desc" },
    }),
    prisma.manga.count({ where: { status: "published" } }),
    prisma.manga.count({ where: { status: "culled" } }),
    prisma.manga.aggregate({ _avg: { score: true } }),
  ]);

  return {
    mangas,
    publishedCount,
    culledCount,
    averageScore: avgResult._avg.score ?? 0,
  };
}

export default async function AdminScoresPage() {
  const { mangas, publishedCount, culledCount, averageScore } =
    await getScoreData();

  const rows: ScoreTableRow[] = mangas.map((m) => ({
    id: m.id,
    title: m.title,
    totalViews: m.totalViews,
    totalLikes: m.totalLikes,
    totalShares: m.totalShares,
    score: m.score,
    publishedAt: m.publishedAt?.toISOString() ?? null,
    status: m.status,
  }));

  const soonToCullCount = rows.filter((r) => {
    if (!r.publishedAt || r.status === "culled") return false;
    const days =
      (Date.now() - new Date(r.publishedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    return days >= 23 && r.score < 10;
  }).length;

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Score Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View buzz scores, trigger recalculation, and manage culling.
        </p>
      </div>

      <ScoreStatsCards
        publishedCount={publishedCount}
        culledCount={culledCount}
        averageScore={averageScore}
        soonToCullCount={soonToCullCount}
      />

      <ScoreTableClient rows={rows} />
    </main>
  );
}
