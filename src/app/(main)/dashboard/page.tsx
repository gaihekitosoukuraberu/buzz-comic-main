import { Suspense } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Eye,
  Heart,
  DollarSign,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";

export const metadata = {
  title: "ダッシュボード | Buzz Comic",
};

/* ---- Status helpers ---- */
type MangaStatus = "draft" | "pending" | "approved" | "rejected" | "published" | "culled";

function StatusBadge({ status }: { status: MangaStatus }) {
  const map: Record<MangaStatus, { label: string; icon: React.ComponentType<{className?: string}>; variant: "default" | "warning" | "success" | "destructive" | "secondary" }> = {
    draft: { label: "下書き", icon: Clock, variant: "secondary" },
    pending: { label: "審査待ち", icon: AlertCircle, variant: "warning" },
    approved: { label: "承認済み", icon: CheckCircle2, variant: "success" },
    rejected: { label: "却下", icon: XCircle, variant: "destructive" },
    published: { label: "公開中", icon: CheckCircle2, variant: "success" },
    culled: { label: "非公開", icon: XCircle, variant: "secondary" },
  };
  const { label, icon: Icon, variant } = map[status] ?? map.draft;
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/* ---- Mock data (replace with real DB queries when auth is available) ---- */
const MOCK_STATS = {
  totalViews: 12480,
  totalLikes: 342,
  totalRevenue: 15800,
  publishedCount: 5,
};

const MOCK_MANGAS = [
  {
    id: "1",
    title: "ロボットの夢",
    genre: "sf",
    status: "published" as MangaStatus,
    totalViews: 4200,
    totalLikes: 128,
    score: 8.4,
    coverImageUrl: null,
    createdAt: new Date("2024-05-01"),
  },
  {
    id: "2",
    title: "恋する剣士",
    genre: "romance",
    status: "pending" as MangaStatus,
    totalViews: 0,
    totalLikes: 0,
    score: 0,
    coverImageUrl: null,
    createdAt: new Date("2024-05-10"),
  },
  {
    id: "3",
    title: "笑えるヒーロー",
    genre: "comedy",
    status: "draft" as MangaStatus,
    totalViews: 0,
    totalLikes: 0,
    score: 0,
    coverImageUrl: null,
    createdAt: new Date("2024-05-15"),
  },
  {
    id: "4",
    title: "影の刺客",
    genre: "action",
    status: "rejected" as MangaStatus,
    totalViews: 0,
    totalLikes: 0,
    score: 0,
    coverImageUrl: null,
    createdAt: new Date("2024-05-08"),
  },
];

const GENRE_LABELS: Record<string, string> = {
  action: "アクション",
  romance: "ロマンス",
  comedy: "コメディ",
  horror: "ホラー",
  sf: "SF",
  general: "一般",
};

/* ---- Main Page ---- */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            ダッシュボード
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            あなたの作品と収益を管理しましょう
          </p>
        </div>
        <Link href="/generate">
          <Button size="lg" className="gap-2">
            <PlusCircle className="h-5 w-5" />
            新しい漫画を生成
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <Suspense fallback={<PageSpinner />}>
        <StatsGrid stats={MOCK_STATS} />
      </Suspense>

      {/* Manga list */}
      <div className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            マイ漫画
          </h2>
          <Link href="/gallery?mine=1" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
            すべて見る →
          </Link>
        </div>
        <Suspense fallback={<PageSpinner />}>
          <MangaList mangas={MOCK_MANGAS} />
        </Suspense>
      </div>

      {/* Revenue link */}
      <div className="mt-8">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center gap-4 py-10 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">収益管理</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  詳細な収益レポートと振込履歴を確認
                </p>
              </div>
            </div>
            <Link href="/dashboard/revenue">
              <Button variant="outline" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                収益を見る
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---- Stats Grid ---- */
function StatsGrid({ stats }: { stats: typeof MOCK_STATS }) {
  const items = [
    {
      label: "総ビュー数",
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
      color: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "いいね数",
      value: stats.totalLikes.toLocaleString(),
      icon: Heart,
      color: "from-pink-500 to-rose-600",
      bg: "bg-pink-50 dark:bg-pink-950/30",
    },
    {
      label: "累計収益",
      value: `¥${stats.totalRevenue.toLocaleString("ja-JP")}`,
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "公開中の作品",
      value: stats.publishedCount.toString(),
      icon: BookOpen,
      color: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className={`${bg} border-slate-200/60 dark:border-slate-700/60`}>
          <CardContent className="py-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {label}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {value}
                </p>
              </div>
              <div
                className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-sm`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---- Manga List ---- */
function MangaList({ mangas }: { mangas: typeof MOCK_MANGAS }) {
  if (mangas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 px-4 text-center">
        <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          まだ漫画がありません。最初の作品を作りましょう！
        </p>
        <Link href="/generate">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            今すぐ生成
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <th className="px-5 py-3">タイトル</th>
              <th className="px-5 py-3">ジャンル</th>
              <th className="px-5 py-3">状態</th>
              <th className="px-5 py-3 text-right">ビュー</th>
              <th className="px-5 py-3 text-right">いいね</th>
              <th className="px-5 py-3 text-right">スコア</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {mangas.map((manga) => (
              <tr
                key={manga.id}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {manga.coverImageUrl ? (
                        <Avatar
                          src={manga.coverImageUrl}
                          name={manga.title}
                          size="sm"
                        />
                      ) : (
                        <BookOpen className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                      {manga.title}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                  {GENRE_LABELS[manga.genre] ?? manga.genre}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={manga.status} />
                </td>
                <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                  {manga.totalViews.toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                  {manga.totalLikes.toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right text-sm font-semibold text-amber-500">
                  {manga.score > 0 ? manga.score.toFixed(1) : "-"}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/manga/${manga.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
