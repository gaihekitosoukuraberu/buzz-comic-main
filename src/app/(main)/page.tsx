import Link from "next/link";
import { Suspense } from "react";
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Users,
  Eye,
  ImageIcon,
  Zap,
  Share2,
  DollarSign,
  Star,
} from "lucide-react";
import { getTopMangas } from "@/lib/manga";
import MangaCard from "@/components/manga/MangaCard";

export const revalidate = 60;

export const metadata = {
  title: "Buzz Comic - AIで漫画を作ろう",
  description:
    "AIを活用してバズる漫画を誰でも簡単に生成・投稿・収益化できる次世代コミックプラットフォーム。",
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <Suspense fallback={<ShowcaseSkeleton />}>
        <ShowcaseSection />
      </Suspense>
      <StatsSection />
      <CtaSection />
    </div>
  );
}

/* ---- Hero ---- */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-1/3 right-0 h-[700px] w-[700px] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 -left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-36 lg:px-8">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>AIで誰でも漫画が作れる時代へ</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-black tracking-tight leading-tight sm:text-6xl lg:text-7xl">
            AIで漫画を
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              作ろう
            </span>
          </h1>

          <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
            プロンプト一つで高品質な漫画を自動生成。投稿して世界に届け、収益化まで一気通貫。
            <strong className="text-white"> 完全無料</strong>で今すぐ始めよう。
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/generate"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 text-base font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition-all duration-200 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
              今すぐ無料で生成
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
            >
              <BookOpen className="h-5 w-5" />
              作品を見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Wave separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full text-slate-50 dark:text-slate-950"
        >
          <path
            d="M0 60L60 50C120 40 240 20 360 13.3C480 6.7 600 13.3 720 23.3C840 33.3 960 46.7 1080 50C1200 53.3 1320 46.7 1380 43.3L1440 40V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}

/* ---- Features ---- */
const FEATURES = [
  {
    icon: Zap,
    title: "AIで瞬時に生成",
    description:
      "プロンプトを入力するだけでAIが高品質な漫画パネルを自動生成。誰でもプロのような作品が作れます。",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: Share2,
    title: "すぐに投稿・シェア",
    description:
      "生成した漫画をワンクリックで投稿。Twitter・Instagram・TikTokへの自動シェアにも対応。",
    color: "from-purple-500 to-pink-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    icon: DollarSign,
    title: "収益化で稼ぐ",
    description:
      "人気作品は広告収益・チップ・サブスクリプション分配で収益化。バズれば本業以上も夢じゃない。",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
];

function FeaturesSection() {
  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
            なぜ Buzz Comic？
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            漫画制作のすべてがここに揃っています
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
            <div
              key={title}
              className={`group rounded-2xl border border-slate-200 ${bg} p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 dark:border-slate-800`}
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-sm`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Showcase ---- */
async function ShowcaseSection() {
  const mangas = await getTopMangas(6);

  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              人気の漫画
            </h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              今週もっとも読まれている作品
            </p>
          </div>
          <Link
            href="/gallery?sort=score"
            className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            すべて見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {mangas.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {mangas.map((manga, i) => (
              <MangaCard key={manga.id} manga={manga} priority={i < 3} />
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <ImageIcon className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">
                まだ作品がありません。最初の漫画を生成しよう！
              </p>
              <Link
                href="/generate"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                漫画を生成する
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ShowcaseSkeleton() {
  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Stats ---- */
const STATS = [
  { icon: BookOpen, label: "総作品数", value: "10,000+", color: "text-blue-600 dark:text-blue-400" },
  { icon: Eye, label: "総ビュー数", value: "5,000,000+", color: "text-purple-600 dark:text-purple-400" },
  { icon: Users, label: "クリエイター数", value: "1,200+", color: "text-green-600 dark:text-green-400" },
  { icon: Star, label: "平均評価", value: "4.8", color: "text-amber-500" },
];

function StatsSection() {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-indigo-700 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-2xl font-bold text-white/90">
          プラットフォームの実績
        </h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-2xl bg-white/10 p-6 text-center backdrop-blur-sm border border-white/10"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm text-white/70">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- CTA ---- */
function CtaSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-8 py-16 sm:px-16 relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -top-1/2 -right-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -bottom-1/2 -left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/20 blur-3xl" />
          </div>
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-sm text-amber-300">
              <Sparkles className="h-4 w-4" />
              完全無料で始められます
            </div>
            <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
              今すぐ無料で
              <br />
              <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                始めましょう
              </span>
            </h2>
            <p className="mb-10 text-lg text-white/70">
              クレジットカード不要。登録後すぐに漫画を生成できます。
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/auth/register"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 text-base font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02] hover:shadow-amber-500/50 active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
                無料アカウントを作成
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
              >
                <TrendingUp className="h-5 w-5" />
                作品を見る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
