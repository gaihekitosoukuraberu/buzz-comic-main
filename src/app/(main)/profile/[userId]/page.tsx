import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { BookOpen, Heart, Eye, Calendar, Star, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import MangaCard from "@/components/manga/MangaCard";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const user = await getUser(userId);
  if (!user) return { title: "ユーザーが見つかりません" };
  return {
    title: `${user.name ?? "匿名"} のプロフィール | Buzz Comic`,
    description: user.bio ?? `${user.name ?? "クリエイター"} の漫画作品一覧`,
  };
}

async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      bio: true,
      role: true,
      totalRevenue: true,
      createdAt: true,
      _count: {
        select: {
          mangas: true,
        },
      },
    },
  });
}

async function getUserMangas(userId: string) {
  return prisma.manga.findMany({
    where: {
      authorId: userId,
      status: "published",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      description: true,
      coverImageUrl: true,
      genre: true,
      score: true,
      totalViews: true,
      totalLikes: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params;

  const [user, mangas] = await Promise.all([
    getUser(userId),
    getUserMangas(userId),
  ]);

  if (!user) notFound();

  const totalViews = mangas.reduce((sum, m) => sum + m.totalViews, 0);
  const totalLikes = mangas.reduce((sum, m) => sum + m.totalLikes, 0);
  const avgScore =
    mangas.length > 0
      ? mangas.reduce((sum, m) => sum + m.score, 0) / mangas.length
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
            <Avatar
              src={user.avatarUrl}
              name={user.name}
              size="xl"
              className="ring-4 ring-white/20 shadow-xl"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-black sm:text-3xl">
                  {user.name ?? "匿名クリエイター"}
                </h1>
                {user.role === "admin" && (
                  <Badge className="bg-red-500 text-white">管理者</Badge>
                )}
                {user.role === "creator" && (
                  <Badge className="bg-amber-400 text-slate-900">クリエイター</Badge>
                )}
              </div>
              {user.bio && (
                <p className="mt-2 max-w-xl text-white/75 leading-relaxed">
                  {user.bio}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(user.createdAt)} 登録
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {user._count.mangas} 作品
                </span>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:grid-cols-4">
            <StatItem icon={BookOpen} label="公開作品" value={mangas.length} />
            <StatItem icon={Eye} label="総ビュー" value={totalViews.toLocaleString()} />
            <StatItem icon={Heart} label="総いいね" value={totalLikes.toLocaleString()} />
            <StatItem
              icon={Star}
              label="平均スコア"
              value={avgScore > 0 ? avgScore.toFixed(1) : "-"}
              className="hidden sm:flex"
            />
          </div>
        </div>
      </div>

      {/* Manga Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            投稿した漫画
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {mangas.length > 0
              ? `${mangas.length}件の公開作品`
              : "まだ公開作品がありません"}
          </p>
        </div>

        {mangas.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {mangas.map((manga, i) => (
              <MangaCard key={manga.id} manga={manga} priority={i < 6} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 px-4 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              このクリエイターはまだ作品を公開していません
            </p>
            <Link
              href="/gallery"
              className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              他の作品を見る →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ""}`}>
      <Icon className="h-5 w-5 text-white/60" />
      <span className="text-xl font-black">{value}</span>
      <span className="text-xs text-white/50">{label}</span>
    </div>
  );
}
