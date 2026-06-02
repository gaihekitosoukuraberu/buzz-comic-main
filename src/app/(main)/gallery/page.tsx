import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublishedMangas, GENRES, type SortType } from "@/lib/manga";
import MangaGrid from "@/components/manga/MangaGrid";
import GalleryControls from "./GalleryControls";
import GalleryPagination from "./GalleryPagination";

export const metadata: Metadata = {
  title: "ギャラリー | Buzz Comic",
  description: "Buzz Comicのすべての漫画を探索しよう",
};

interface GalleryPageProps {
  searchParams: Promise<{
    genre?: string;
    sort?: string;
    page?: string;
    q?: string;
  }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const genre = params.genre ?? "all";
  const sort = (params.sort ?? "newest") as SortType;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.q ?? "";
  const pageSize = 24;

  const { mangas, total, totalPages } = await getPublishedMangas({
    genre: genre === "all" ? undefined : genre,
    sort,
    page,
    pageSize,
    search: search || undefined,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ギャラリー</h1>
          <p className="text-gray-500 mt-1">
            {total > 0 ? `${total}件の漫画` : "漫画が見つかりませんでした"}
          </p>
        </div>

        {/* Controls: search, genre filter, sort */}
        <GalleryControls
          currentGenre={genre}
          currentSort={sort}
          currentSearch={search}
          genres={GENRES}
        />

        {/* Grid */}
        <Suspense
          fallback={
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          }
        >
          <div className="mt-6">
            <MangaGrid mangas={mangas} columns={4} />
          </div>
        </Suspense>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10">
            <GalleryPagination
              currentPage={page}
              totalPages={totalPages}
              genre={genre}
              sort={sort}
              search={search}
            />
          </div>
        )}
      </div>
    </div>
  );
}
