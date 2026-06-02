import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Star, Eye, Heart, Crown, Medal } from "lucide-react";
import { getRankingMangas } from "@/lib/manga";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ランキング | Buzz Comic",
  description: "Buzz Comicの人気漫画ランキング",
};

export const revalidate = 300; // Revalidate every 5 minutes

interface RankingPageProps {
  searchParams: Promise<{ period?: string }>;
}

type Period = "weekly" | "monthly" | "alltime";

const PERIODS: { value: Period; label: string }[] = [
  { value: "weekly", label: "週間" },
  { value: "monthly", label: "月間" },
  { value: "alltime", label: "全期間" },
];

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const params = await searchParams;
  const period = (params.period ?? "alltime") as Period;
  const validPeriod = PERIODS.some((p) => p.value === period) ? period : "alltime";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ランキング</h1>
            <p className="text-gray-500 text-sm">スコア上位の漫画TOP50</p>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-gray-200">
          {PERIODS.map(({ value, label }) => (
            <Link
              key={value}
              href={`/ranking${value !== "alltime" ? `?period=${value}` : ""}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                validPeriod === value
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Ranking List */}
        <Suspense fallback={<RankingSkeleton />}>
          <RankingList period={validPeriod} />
        </Suspense>
      </div>
    </div>
  );
}

async function RankingList({ period }: { period: Period }) {
  const mangas = await getRankingMangas(period, 50);

  if (mangas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Trophy className="w-12 h-12 mb-4 text-gray-300" />
        <p>この期間のランキングデータがありません</p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {mangas.map((manga, index) => {
        const rank = index + 1;
        return (
          <li key={manga.id}>
            <Link
              href={`/manga/${manga.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-10 flex items-center justify-center">
                {rank === 1 ? (
                  <Crown className="w-7 h-7 text-amber-400" />
                ) : rank === 2 ? (
                  <Medal className="w-6 h-6 text-gray-400" />
                ) : rank === 3 ? (
                  <Medal className="w-6 h-6 text-amber-700" />
                ) : (
                  <span className={`text-lg font-bold tabular-nums ${rank <= 10 ? "text-gray-700" : "text-gray-400"}`}>
                    {rank}
                  </span>
                )}
              </div>

              {/* Cover */}
              <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {manga.coverImageUrl ? (
                  <Image
                    src={manga.coverImageUrl}
                    alt={manga.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                    📖
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                  {manga.title}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {manga.author.name ?? "匿名"} &middot; {formatDate(manga.createdAt)}
                </p>
                {manga.genre && (
                  <span className="inline-block mt-1 text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">
                    {manga.genre}
                  </span>
                )}
              </div>

              {/* Score & Stats */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                  {manga.score.toFixed(1)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Eye className="w-3 h-3" />
                  {formatCount(manga.totalViews)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Heart className="w-3 h-3" />
                  {formatCount(manga.totalLikes)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function RankingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4">
          <div className="w-10 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-12 h-16 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
          <div className="space-y-1">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-12" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
