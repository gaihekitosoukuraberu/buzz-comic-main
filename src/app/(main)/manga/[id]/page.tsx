import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { getMangaById, getRelatedMangas } from "@/lib/manga";
import MangaViewer from "@/components/manga/MangaViewer";
import MangaCard from "@/components/manga/MangaCard";
import LikeButton from "./LikeButton";
import ShareButton from "./ShareButton";
import CommentSection from "./CommentSection";
import { Eye, Star, Calendar, User, BookOpen } from "lucide-react";

interface MangaPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MangaPageProps): Promise<Metadata> {
  const { id } = await params;
  const manga = await getMangaById(id);
  if (!manga) return { title: "漫画が見つかりません | Buzz Comic" };
  return {
    title: `${manga.title} | Buzz Comic`,
    description: manga.description ?? "Buzz Comicで読む",
    openGraph: {
      title: manga.title,
      description: manga.description ?? undefined,
      images: manga.coverImageUrl ? [manga.coverImageUrl] : [],
    },
  };
}

export default async function MangaPage({ params }: MangaPageProps) {
  const { id } = await params;
  const manga = await getMangaById(id);

  if (!manga || manga.status !== "published") {
    notFound();
  }

  const related = await getRelatedMangas(id, manga.genre, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Meta Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-6 p-6">
            {/* Cover */}
            <div className="relative w-full sm:w-40 aspect-[3/4] sm:aspect-auto sm:h-56 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              {manga.coverImageUrl ? (
                <Image
                  src={manga.coverImageUrl}
                  alt={manga.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 640px) 100vw, 160px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-4xl">
                  📖
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-3">
              {manga.genre && (
                <span className="inline-block w-fit bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {manga.genre}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {manga.title}
              </h1>
              {manga.description && (
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {manga.description}
                </p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {manga.author.name ?? "匿名"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(manga.publishedAt ?? manga.createdAt)}
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                  {manga.score.toFixed(1)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {manga.totalViews.toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {manga.panels.length}コマ
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-auto pt-2">
                <LikeButton
                  mangaId={manga.id}
                  initialLikes={manga.totalLikes}
                />
                <ShareButton title={manga.title} />
              </div>
            </div>
          </div>
        </div>

        {/* Manga Viewer */}
        {manga.panels.length > 0 ? (
          <section aria-label="漫画ビューワー">
            <MangaViewer
              panels={manga.panels}
              title={manga.title}
              mangaId={manga.id}
            />
          </section>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">
            <p className="text-lg">パネルがまだありません</p>
          </div>
        )}

        {/* Comments */}
        <section aria-label="コメント">
          <CommentSection
            mangaId={manga.id}
            comments={manga.comments}
            commentCount={manga._count.comments}
          />
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section aria-label="関連漫画">
            <h2 className="text-xl font-bold text-gray-900 mb-4">関連漫画</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {related.map((m) => (
                <MangaCard key={m.id} manga={m} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
